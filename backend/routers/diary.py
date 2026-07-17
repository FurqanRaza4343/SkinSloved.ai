import uuid
import base64
from pathlib import Path
from datetime import datetime
from fastapi import APIRouter, HTTPException
from groq import Groq
from mistralai import Mistral
from config import settings
from services.db_service import get_consultations_by_ids, save_consultation, save_consultation_image
from services.storage_service import upload_file

TEMP_DIR = Path(__file__).resolve().parent.parent / "temp"
TEMP_DIR.mkdir(exist_ok=True)

router = APIRouter(prefix="/api/diary", tags=["Diary"])

DIARY_SYSTEM_PROMPT = """You are a personal AI skin health coach analyzing a user's photo diary over time.

The user has provided skin check-in photos with dates. Your job is to:
1. Compare the most recent photos against earlier ones
2. Give a clear improvement/decline rating (better, worse, no change, mixed)
3. Score the skin on a scale of 1-10 (10 = best)
4. Highlight specific changes you notice (redness, texture, breakouts, healing, etc.)
5. Provide personalized, actionable recommendations
6. Be encouraging but honest — celebrate progress and flag concerns

Each entry includes: date, severity (mild/moderate/urgent), what the user said, doctor's analysis, and whether a photo was taken.

Keep responses conversational, warm, and under 150 words unless the user asks for detail. Never give medical diagnoses — always recommend consulting a dermatologist for concerns."""


@router.post("/analyze")
async def analyze_diary(request: dict):
    message = request.get("message", "")
    consultation_ids = request.get("consultation_ids", [])
    history = request.get("history", [])

    if not consultation_ids:
        raise HTTPException(status_code=400, detail="consultation_ids is required")
    if not message:
        raise HTTPException(status_code=400, detail="message is required")

    if not settings.groq_api_key:
        raise HTTPException(status_code=500, detail="AI service not configured")

    consultations = await get_consultations_by_ids(consultation_ids)
    if not consultations:
        raise HTTPException(status_code=404, detail="No consultations found")

    entries_text = ""
    for i, c in enumerate(consultations):
        entries_text += (
            f"\n--- Day {i + 1} ({c.get('created_at', 'unknown')[:10]}) ---\n"
            f"Severity: {c.get('severity', 'unknown')}\n"
            f"Patient: {c.get('patient_text', 'N/A')[:200]}\n"
            f"Analysis: {c.get('doctor_response', 'N/A')[:300]}\n"
            f"Photo: {'Yes' if c.get('image_url') else 'No'}\n"
        )

    total_days = 0
    if len(consultations) >= 2:
        from datetime import datetime
        d1 = datetime.fromisoformat(consultations[0]["created_at"].replace("Z", "+00:00"))
        d2 = datetime.fromisoformat(consultations[-1]["created_at"].replace("Z", "+00:00"))
        total_days = max(1, (d2 - d1).days)

    client = Groq(api_key=settings.groq_api_key)

    messages = [{"role": "system", "content": DIARY_SYSTEM_PROMPT}]

    messages.append({
        "role": "user",
        "content": (
            f"Here is the user's skin diary with {len(consultations)} check-ins "
            f"spanning {total_days} days:\n{entries_text}\n\n"
            f"User's message: {message}"
        ),
    })

    for h in history[-10:]:
        messages.append({"role": h["role"], "content": h["content"]})

    response = client.chat.completions.create(
        model=settings.groq_model,
        max_completion_tokens=1500,
        temperature=0.4,
        messages=messages,
    )

    return {"response": response.choices[0].message.content}


DIARY_CHECKIN_PROMPT = """You are a friendly AI skin coach. The user has uploaded a daily skin check-in photo and a short note. 
Your job is to:
1. Acknowledge their effort (positive reinforcement)
2. Briefly analyze what you observe from the photo description and note
3. Give a simple skin score (1-10 scale, 10=best)
4. Offer 1-2 specific, actionable tips
5. Be warm, encouraging, and under 100 words

Never give medical diagnoses. Always recommend consulting a dermatologist for concerns."""


@router.post("/checkin")
async def diary_checkin(request: dict):
    image_data = request.get("image_data")
    note = request.get("note", "")
    user_id = request.get("user_id")

    if not image_data and not note:
        raise HTTPException(status_code=400, detail="At least image or note is required")

    if not settings.mistral_api_key:
        raise HTTPException(status_code=500, detail="AI service not configured")

    saved_consultation = await save_consultation(
        user_id=user_id,
        patient_text=note or "Daily skin diary check-in",
        severity="mild",
        status="checkin",
    )
    if not saved_consultation:
        raise HTTPException(status_code=500, detail="Failed to save check-in")

    consultation_id = saved_consultation.get("id")
    image_description = "No photo"

    if image_data and consultation_id:
        try:
            if "," in image_data:
                img_bytes = base64.b64decode(image_data.split(",")[1])
            else:
                img_bytes = base64.b64decode(image_data)
            temp_path = TEMP_DIR / f"diary_{uuid.uuid4()}.jpg"
            with open(temp_path, "wb") as f:
                f.write(img_bytes)
            storage_url = await upload_file(
                filepath=str(temp_path),
                bucket="consultation-images",
                key=f"diary/{consultation_id}/checkin.jpg",
            )
            temp_path.unlink(missing_ok=True)
            if storage_url:
                await save_consultation_image(
                    consultation_id=consultation_id,
                    storage_url=storage_url,
                    storage_key=f"diary/{consultation_id}/checkin.jpg",
                )
                saved_consultation["image_url"] = storage_url
                image_description = "User uploaded a skin photo for check-in"
        except Exception as e:
            image_description = f"Photo upload attempted but failed: {str(e)}"

    client = Mistral(api_key=settings.mistral_api_key)
    response = client.chat.complete(
        model=settings.mistral_model,
        messages=[
            {"role": "system", "content": DIARY_CHECKIN_PROMPT},
            {"role": "user", "content": f"Check-in note: \"{note}\"\nPhoto status: {image_description}"},
        ],
        max_tokens=300,
        temperature=0.5,
    )

    ai_response = response.choices[0].message.content

    return {
        "id": consultation_id,
        "ai_response": ai_response,
        "created_at": datetime.utcnow().isoformat(),
    }

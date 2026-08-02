import uuid
import base64
import asyncio
import logging
from io import BytesIO
from pathlib import Path
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request
from groq import Groq
from mistralai import Mistral
from PIL import Image
from rate_limit import limiter
from config import settings
from services.db_service import get_consultations_by_ids, save_consultation, save_consultation_image
from services.storage_service import upload_file

logger = logging.getLogger(__name__)

TEMP_DIR = Path(__file__).resolve().parent.parent / "temp"
TEMP_DIR.mkdir(exist_ok=True)

router = APIRouter(prefix="/api/diary", tags=["Diary"])

MAX_CHECKIN_IMAGE_SIZE = 10 * 1024 * 1024
MIN_CHECKIN_DIMENSION = 100
CHECKIN_VISION_TIMEOUT = 15
CHECKIN_MISTRAL_TIMEOUT = 15
DIARY_ANALYZE_TIMEOUT = 20


def _validate_base64_image(data: str) -> bytes:
    try:
        if "," in data:
            img_bytes = base64.b64decode(data.split(",")[1])
        else:
            img_bytes = base64.b64decode(data)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image data (not valid base64).")
    if len(img_bytes) > MAX_CHECKIN_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail=f"Image too large ({len(img_bytes) // (1024*1024)}MB). Maximum is 10MB.")
    try:
        img = Image.open(BytesIO(img_bytes))
        img.verify()
        if img.size[0] < MIN_CHECKIN_DIMENSION or img.size[1] < MIN_CHECKIN_DIMENSION:
            raise HTTPException(status_code=400, detail=f"Image too small ({img.size[0]}x{img.size[1]}). Minimum is {MIN_CHECKIN_DIMENSION}x{MIN_CHECKIN_DIMENSION}.")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or corrupted image file.")
    return img_bytes


def _sanitize_history(history: list) -> list[dict]:
    safe = []
    for h in history[-10:]:
        role = h.get("role", "")
        content = str(h.get("content", ""))[:2000]
        if role in ("user", "assistant") and content:
            safe.append({"role": role, "content": content})
    return safe


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
@limiter.limit("20/hour")
async def analyze_diary(request: Request, req_body: dict):
    message = req_body.get("message", "")
    consultation_ids = req_body.get("consultation_ids", [])
    history = req_body.get("history", [])

    if not consultation_ids:
        raise HTTPException(status_code=400, detail="consultation_ids is required")
    if not message or len(message) > 2000:
        raise HTTPException(status_code=400, detail="message is required (max 2000 chars)")

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
        try:
            d1 = datetime.fromisoformat(consultations[0]["created_at"].replace("Z", "+00:00"))
            d2 = datetime.fromisoformat(consultations[-1]["created_at"].replace("Z", "+00:00"))
            total_days = max(1, (d2 - d1).days)
        except Exception:
            pass

    def _groq_analyze():
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
        messages.extend(_sanitize_history(history))
        response = client.chat.completions.create(
            model=settings.groq_model,
            max_completion_tokens=1500,
            temperature=0.4,
            messages=messages,
        )
        return response.choices[0].message.content

    try:
        result = await asyncio.wait_for(
            asyncio.to_thread(_groq_analyze),
            timeout=DIARY_ANALYZE_TIMEOUT,
        )
        return {"response": result}
    except asyncio.TimeoutError:
        logger.warning("Diary analyze timed out")
        return {"response": "Analysis is taking longer than expected. Please try again."}
    except Exception as e:
        logger.error(f"Diary analyze failed: {e}")
        raise HTTPException(status_code=500, detail="AI analysis failed")


DIARY_CHECKIN_PROMPT = """You are a friendly AI skin coach. The user has uploaded a daily skin check-in photo and a short note. 
Your job is to:
1. Acknowledge their effort (positive reinforcement)
2. Briefly analyze what you observe from the photo description and note
3. Give a simple skin score (1-10 scale, 10=best)
4. Offer 1-2 specific, actionable tips
5. Be warm, encouraging, and under 100 words

Never give medical diagnoses. Always recommend consulting a dermatologist for concerns."""


def _encode_image_for_vision(filepath: str) -> str:
    image = Image.open(filepath)
    image.thumbnail((512, 512))
    buffer = BytesIO()
    image.convert("RGB").save(buffer, format="JPEG", quality=60)
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


def _analyze_image_with_groq(filepath: str) -> str:
    if not settings.groq_api_key:
        return "Vision analysis unavailable"
    try:
        image_data = _encode_image_for_vision(filepath)
        client = Groq(api_key=settings.groq_api_key)
        response = client.chat.completions.create(
            model=settings.groq_model,
            max_completion_tokens=300,
            messages=[
                {"role": "system", "content": "Describe this skin photo in 2 sentences: texture, redness, blemishes."},
                {"role": "user", "content": [
                    {"type": "text", "text": "Analyze this skin check-in photo."},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_data}"}},
                ]},
            ],
        )
        return response.choices[0].message.content
    except Exception:
        return "Vision analysis unavailable"


@router.post("/checkin")
@limiter.limit("10/hour")
async def diary_checkin(request: Request, req_body: dict):
    image_data = req_body.get("image_data")
    note = req_body.get("note", "")
    user_id = req_body.get("user_id")

    if not image_data and not note:
        raise HTTPException(status_code=400, detail="At least image or note is required")
    if note and len(note) > 2000:
        raise HTTPException(status_code=400, detail="Note too long (max 2000 chars)")

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
    temp_path = None

    if image_data and consultation_id:
        try:
            img_bytes = _validate_base64_image(image_data)
            temp_path = TEMP_DIR / f"diary_{uuid.uuid4()}.jpg"
            with open(temp_path, "wb") as f:
                f.write(img_bytes)
            vision_description = await asyncio.wait_for(
                asyncio.to_thread(_analyze_image_with_groq, str(temp_path)),
                timeout=CHECKIN_VISION_TIMEOUT,
            )
            storage_url = await upload_file(
                filepath=str(temp_path),
                bucket="consultation-images",
                key=f"diary/{consultation_id}/checkin.jpg",
            )
            if storage_url:
                await save_consultation_image(
                    consultation_id=consultation_id,
                    storage_url=storage_url,
                    storage_key=f"diary/{consultation_id}/checkin.jpg",
                )
                saved_consultation["image_url"] = storage_url
            image_description = vision_description
        except asyncio.TimeoutError:
            logger.warning("Check-in vision timed out")
            image_description = "Photo uploaded, analysis pending"
        except Exception as e:
            image_description = "Photo upload attempted but failed"
            logger.warning(f"Check-in image processing failed: {e}")
        finally:
            if temp_path and temp_path.exists():
                try:
                    temp_path.unlink()
                except OSError:
                    pass

    def _mistral_chat():
        if not settings.mistral_api_key:
            return f"Check-in recorded. Note: {note[:200]}" if note else "Check-in recorded successfully."
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
        return response.choices[0].message.content

    try:
        ai_response = await asyncio.wait_for(
            asyncio.to_thread(_mistral_chat),
            timeout=CHECKIN_MISTRAL_TIMEOUT,
        )
    except asyncio.TimeoutError:
        logger.warning("Check-in Mistral timed out")
        ai_response = "Check-in recorded! Analysis will be available shortly."
    except Exception as e:
        logger.error(f"Check-in Mistral failed: {e}")
        ai_response = "Check-in recorded successfully."

    return {
        "id": consultation_id,
        "ai_response": ai_response,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

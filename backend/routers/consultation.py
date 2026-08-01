import os
import io
import json
import uuid
import asyncio
import logging
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Header, Request
from fastapi.responses import StreamingResponse
from PIL import Image
from rate_limit import limiter

logger = logging.getLogger(__name__)
from services.stt_service import transcribe_audio
from services.tts_service import generate_audio
from services.storage_service import upload_file
from services.db_service import (
    save_consultation, save_consultation_image,
    get_user_consultations_with_images, get_consultation,
    get_consultation_with_images, get_consultation_images,
)
from agents.orchestrator import AgentOrchestrator
from agents.vision_agent import VisionAgent
from agents.diagnosis_agent import DiagnosisAgent
from agents.treatment_agent import TreatmentAgent
from services.product_service import generate_product_recommendations

router = APIRouter(prefix="/api/consultations", tags=["Consultations"])
transcribe_router = APIRouter(prefix="/api", tags=["Transcription"])
orchestrator = AgentOrchestrator()

TEMP_DIR = Path(__file__).resolve().parent.parent / "temp"
TEMP_DIR.mkdir(exist_ok=True)

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB
MAX_AUDIO_SIZE = 25 * 1024 * 1024  # 25 MB
MAX_VIDEO_SIZE = 50 * 1024 * 1024  # 50 MB
MIN_DIMENSION = 100


def validate_image(file: UploadFile, content: bytes) -> None:
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid image type '{file.content_type}'. Allowed: JPEG, PNG, WebP.")
    if len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail=f"Image too large ({len(content) // (1024*1024)}MB). Maximum is 10MB.")
    try:
        img = Image.open(io.BytesIO(content))
        img.verify()
        if img.size[0] < MIN_DIMENSION or img.size[1] < MIN_DIMENSION:
            raise HTTPException(status_code=400, detail=f"Image too small ({img.size[0]}x{img.size[1]}). Minimum is {MIN_DIMENSION}x{MIN_DIMENSION}.")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or corrupted image file.")


def _safe_unlink(path: Path | None):
    if path and path.exists():
        try:
            path.unlink()
        except OSError as e:
            logger.warning(f"Failed to delete temp file {path}: {e}")


async def _verify_consultation_owner(consultation_id: str, x_user_id: str | None) -> dict:
    """Fetch consultation and verify ownership. Raises 404 if not found, 403 if not owner."""
    consultation = await get_consultation(consultation_id)
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
    if x_user_id and consultation.get("user_id") and consultation["user_id"] != x_user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return consultation


@transcribe_router.post("/transcribe")
async def transcribe_audio_endpoint(audio: UploadFile = File(...)):
    if audio.size and audio.size > MAX_AUDIO_SIZE:
        raise HTTPException(status_code=400, detail=f"Audio too large. Maximum is {MAX_AUDIO_SIZE // (1024*1024)}MB.")
    audio_content = await audio.read()
    audio_path = TEMP_DIR / f"temp_{uuid.uuid4()}.webm"
    try:
        with open(audio_path, "wb") as f:
            f.write(audio_content)
        text = await asyncio.to_thread(transcribe_audio, str(audio_path))
        return {"text": text}
    finally:
        _safe_unlink(audio_path)


@router.post("")
@limiter.limit("5/hour")
async def create_consultation(
    request: Request,
    audio: UploadFile = File(..., description="Patient voice recording"),
    image: UploadFile | None = File(None, description="Skin image"),
    video: UploadFile | None = File(None, description="Skin video"),
    answers: str | None = Form(None, description="Follow-up answers JSON"),
    x_user_id: str | None = Header(None, alias="X-User-Id"),
):
    if not image:
        raise HTTPException(status_code=400, detail="A skin image is required for analysis.")
    if audio.size and audio.size > MAX_AUDIO_SIZE:
        raise HTTPException(status_code=400, detail=f"Audio too large. Maximum is {MAX_AUDIO_SIZE // (1024*1024)}MB.")

    consult_id = str(uuid.uuid4())
    audio_path = TEMP_DIR / f"{consult_id}_audio.mp3"
    image_path = TEMP_DIR / f"{consult_id}_image.jpg"
    video_path = None

    try:
        audio_content = await audio.read()
        with open(audio_path, "wb") as f:
            f.write(audio_content)

        image_content = await image.read()
        validate_image(image, image_content)
        with open(image_path, "wb") as f:
            f.write(image_content)

        if video:
            if video.size and video.size > MAX_VIDEO_SIZE:
                raise HTTPException(status_code=400, detail=f"Video too large. Maximum is {MAX_VIDEO_SIZE // (1024*1024)}MB.")
            video_path = TEMP_DIR / f"{consult_id}_video.mp4"
            video_content = await video.read()
            with open(video_path, "wb") as f:
                f.write(video_content)

        try:
            patient_text = await asyncio.to_thread(transcribe_audio, str(audio_path))
        except Exception as e:
            raise HTTPException(status_code=500, detail="Transcription failed")

        image_url = None
        try:
            image_url = await upload_file(str(image_path), "consultation-media", f"{consult_id}/image.jpg")
        except Exception as e:
            logger.warning(f"Image upload failed: {e}")

        followup_answers = answers or ""

        try:
            result = await asyncio.to_thread(
                orchestrator.run,
                patient_text=patient_text,
                image_path=str(image_path),
                video_path=str(video_path) if video_path else None,
                followup_answers=followup_answers,
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail="AI analysis failed")

        doctor_response = result.treatment
        products_data = result.products
        detections_data = [
            {"disease": d.disease, "confidence": d.confidence, "severity": d.severity}
            for d in result.detections
        ]
        explanation = result.explanation

        overall_severity = "mild"
        if detections_data:
            sev = detections_data[0]["severity"]
            if sev in ("severe", "urgent"):
                overall_severity = "urgent"
            elif sev == "moderate":
                overall_severity = "moderate"

        audio_output_path = None
        try:
            audio_output_path = await asyncio.to_thread(generate_audio, doctor_response)
        except Exception as e:
            logger.warning(f"TTS generation failed: {e}")

        audio_url = None
        if audio_output_path:
            try:
                audio_url = await upload_file(str(audio_output_path), "consultation-media", f"{consult_id}/response.mp3")
            except Exception as e:
                logger.warning(f"Audio upload failed: {e}")

        try:
            saved = await save_consultation(
                user_id=x_user_id,
                patient_text=patient_text,
                doctor_response=doctor_response,
                severity=overall_severity,
                status="completed",
                image_url=image_url,
                audio_url=audio_url,
                consultation_id=consult_id,
            )
            if saved and saved.get("id"):
                consult_id = saved["id"]
            if image_url:
                await save_consultation_image(
                    consultation_id=consult_id,
                    storage_url=image_url,
                    storage_key=f"{consult_id}/image.jpg",
                )
        except Exception as e:
            logger.warning(f"Failed to save consultation: {e}")

        return {
            "consultation_id": consult_id,
            "transcript": patient_text,
            "doctor_response": doctor_response,
            "products": products_data,
            "detections": detections_data,
            "explanation": explanation,
            "audio_url": audio_url,
            "image_url": image_url,
            "severity": overall_severity,
            "status": "completed",
        }
    finally:
        for p in [audio_path, image_path, video_path]:
            _safe_unlink(p)


@router.post("/process")
@limiter.limit("5/hour")
async def process_consultation_stream(
    request: Request,
    audio: UploadFile = File(..., description="Patient voice recording"),
    image: UploadFile | None = File(None, description="Skin image"),
    video: UploadFile | None = File(None, description="Skin video"),
    answers: str | None = Form(None, description="Follow-up answers JSON"),
    condition: str | None = Form(None, description="Suspected condition slug"),
    x_user_id: str | None = Header(None, alias="X-User-Id"),
):
    if not image:
        raise HTTPException(status_code=400, detail="A skin image is required for analysis.")
    if audio.size and audio.size > MAX_AUDIO_SIZE:
        raise HTTPException(status_code=400, detail=f"Audio too large. Maximum is {MAX_AUDIO_SIZE // (1024*1024)}MB.")

    consult_id = str(uuid.uuid4())
    audio_path = TEMP_DIR / f"{consult_id}_audio.mp3"
    image_path = TEMP_DIR / f"{consult_id}_image.jpg"
    video_path = None

    audio_content = await audio.read()
    with open(audio_path, "wb") as f:
        f.write(audio_content)

    image_content = await image.read()
    validate_image(image, image_content)
    with open(image_path, "wb") as f:
        f.write(image_content)

    if video:
        if video.size and video.size > MAX_VIDEO_SIZE:
            raise HTTPException(status_code=400, detail=f"Video too large. Maximum is {MAX_VIDEO_SIZE // (1024*1024)}MB.")
        video_path = TEMP_DIR / f"{consult_id}_video.mp4"
        video_content = await video.read()
        with open(video_path, "wb") as f:
            f.write(video_content)

    async def event_stream():
        nonlocal consult_id
        patient_text = ""
        try:
            yield f"data: {json.dumps({'agent':'transcription','status':'processing','label':'Transcribing your voice...'})}\n\n"
            patient_text = await asyncio.to_thread(transcribe_audio, str(audio_path))
            yield f"data: {json.dumps({'agent':'transcription','status':'done','label':'Voice transcribed'})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'agent':'transcription','status':'error','label':'Transcription failed'})}\n\n"

        image_url = None
        try:
            image_url = await upload_file(str(image_path), "consultation-media", f"{consult_id}/image.jpg")
        except Exception as e:
            logger.warning(f"Image upload failed in stream: {e}")

        followup_answers = answers or ""
        if condition:
            patient_text = f"[Suspected condition: {condition.replace('-', ' ').title()}]\n{patient_text}"
        context = {
            "patient_text": patient_text,
            "image_path": str(image_path),
            "video_path": str(video_path) if video_path else None,
            "followup_answers": followup_answers,
        }

        try:
            vision = VisionAgent()
            yield f"data: {json.dumps({'agent':'vision','status':'processing','label':'Analyzing skin images...'})}\n\n"
            vision_result = await asyncio.to_thread(vision.process, context)
            context["image_description"] = vision_result.get("image_description", "")
            yield f"data: {json.dumps({'agent':'vision','status':'done','label':'Image analysis complete'})}\n\n"

            diagnosis = DiagnosisAgent()
            yield f"data: {json.dumps({'agent':'diagnosis','status':'processing','label':'Detecting skin conditions...'})}\n\n"
            diagnosis_result = await asyncio.to_thread(diagnosis.process, context)
            detections_data = diagnosis_result.get("detections", [])
            context["detections"] = detections_data
            context["explanation"] = diagnosis_result.get("explanation", "")
            yield f"data: {json.dumps({'agent':'diagnosis','status':'done','label':'Conditions detected'})}\n\n"

            treatment = TreatmentAgent()
            yield f"data: {json.dumps({'agent':'treatment','status':'processing','label':'Generating treatment plan...'})}\n\n"
            treatment_result = await asyncio.to_thread(treatment.process, context)
            context["treatment"] = treatment_result.get("treatment", "")
            yield f"data: {json.dumps({'agent':'treatment','status':'done','label':'Treatment plan ready'})}\n\n"

            yield f"data: {json.dumps({'agent':'products','status':'processing','label':'Finding product recommendations...'})}\n\n"
            top_detection = detections_data[0] if detections_data else {}
            products = await asyncio.to_thread(
                generate_product_recommendations,
                patient_text=patient_text,
                skin_type=top_detection.get("disease", "unknown"),
                severity=top_detection.get("severity", "mild"),
            )
            yield f"data: {json.dumps({'agent':'products','status':'done','label':'Products recommended'})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type':'error','detail':'AI analysis failed'})}\n\n"
            return

        doctor_response = context["treatment"]
        detections = [
            {"disease": d.get("disease", "Unknown"), "confidence": d.get("confidence", 0), "severity": d.get("severity", "mild")}
            for d in detections_data
        ]
        explanation = context.get("explanation", "")

        overall_severity = "mild"
        if detections:
            sev = detections[0]["severity"]
            if sev in ("severe", "urgent"):
                overall_severity = "urgent"
            elif sev == "moderate":
                overall_severity = "moderate"

        audio_output_path = None
        try:
            audio_output_path = await asyncio.to_thread(generate_audio, doctor_response)
        except Exception as e:
            logger.warning(f"TTS generation failed in stream: {e}")

        audio_url = None
        if audio_output_path:
            try:
                audio_url = await upload_file(str(audio_output_path), "consultation-media", f"{consult_id}/response.mp3")
            except Exception as e:
                logger.warning(f"Audio upload failed in stream: {e}")

        for p in [audio_path, image_path, video_path]:
            _safe_unlink(p)

        try:
            saved = await save_consultation(
                user_id=x_user_id,
                patient_text=patient_text,
                doctor_response=doctor_response,
                severity=overall_severity,
                status="completed",
                image_url=image_url,
                audio_url=audio_url,
                consultation_id=consult_id,
            )
            if saved and saved.get("id"):
                consult_id = saved["id"]
            if image_url:
                await save_consultation_image(
                    consultation_id=consult_id,
                    storage_url=image_url,
                    storage_key=f"{consult_id}/image.jpg",
                )
        except Exception as e:
            logger.warning(f"Failed to save consultation in stream: {e}")

        result = {
            "consultation_id": consult_id,
            "transcript": patient_text,
            "doctor_response": doctor_response,
            "products": products,
            "detections": detections,
            "explanation": explanation,
            "audio_url": audio_url,
            "image_url": image_url,
            "severity": overall_severity,
            "status": "completed",
        }
        yield f"data: {json.dumps({'type':'result','data':result})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("")
async def list_consultations(x_user_id: str = Header(alias="X-User-Id")):
    consultations = await get_user_consultations_with_images(x_user_id)
    return consultations


@router.get("/{consultation_id}")
async def get_consultation_endpoint(
    consultation_id: str,
    x_user_id: str | None = Header(None, alias="X-User-Id"),
):
    consultation = await _verify_consultation_owner(consultation_id, x_user_id)
    consultation["image_url"] = None
    consultation["audio_url"] = None
    try:
        images = await get_consultation_images(consultation_id)
        if images:
            consultation["image_url"] = images[0].get("storage_url")
    except Exception:
        pass
    return consultation


@router.get("/{consultation_id}/report")
async def download_report(
    consultation_id: str,
    x_user_id: str | None = Header(None, alias="X-User-Id"),
):
    from services.report_service import generate_consultation_pdf

    consultation = await _verify_consultation_owner(consultation_id, x_user_id)

    images = await get_consultation_images(consultation_id)
    image_url = images[0].get("storage_url") if images else None

    pdf_bytes = generate_consultation_pdf(
        consultation_id=consultation["id"],
        patient_text=consultation["patient_text"],
        doctor_response=consultation["doctor_response"] or "No analysis available.",
        severity=consultation.get("severity"),
        created_at=consultation.get("created_at"),
        image_url=image_url,
    )

    from fastapi.responses import Response
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="skin-consultation-{consultation_id[:8]}.pdf"',
            "Content-Type": "application/pdf",
        },
    )


@router.get("/{consultation_id}/images")
async def get_consultation_images_endpoint(
    consultation_id: str,
    x_user_id: str | None = Header(None, alias="X-User-Id"),
):
    await _verify_consultation_owner(consultation_id, x_user_id)
    images = await get_consultation_images(consultation_id)
    return images


@router.post("/questions")
async def generate_questions(request: dict):
    from agents.followup_agent import FollowUpAgent
    agent = FollowUpAgent()
    text = request.get("text", "")
    if not text or len(text) > 5000:
        raise HTTPException(status_code=400, detail="Text is required (max 5000 chars)")
    questions = await asyncio.to_thread(agent.generate_questions, text.strip())
    return {"questions": questions}


@router.post("/{consultation_id}/chat")
@limiter.limit("20/hour")
async def chat_with_ai(
    request: Request,
    consultation_id: str,
    req_body: dict,
    x_user_id: str | None = Header(None, alias="X-User-Id"),
):
    """Chat with AI about a specific consultation. Uses DB lookup, not user-provided context."""
    from groq import Groq
    from config import settings

    message = req_body.get("message", "")
    history = req_body.get("history", [])

    if not message or len(message) > 2000:
        raise HTTPException(status_code=400, detail="Message is required (max 2000 chars)")

    if not settings.groq_api_key:
        raise HTTPException(status_code=500, detail="AI service not configured")

    consultation = await _verify_consultation_owner(consultation_id, x_user_id)

    patient_text = consultation.get("patient_text", "")
    doctor_response = consultation.get("doctor_response", "")

    safe_history = []
    for h in history[-10:]:
        role = h.get("role", "")
        if role in ("user", "assistant") and "content" in h:
            safe_history.append({"role": role, "content": str(h["content"])[:2000]})

    messages = [
        {
            "role": "system",
            "content": (
                "You are a helpful skin care assistant answering follow-up questions "
                "about a previous consultation. Use the consultation context below to provide "
                "accurate, personalized answers. Be concise (2-4 sentences) and helpful. "
                "Never give medical diagnoses — always recommend consulting a dermatologist."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Previous consultation - Patient said: {patient_text[:1000]}\n"
                f"Doctor's analysis: {doctor_response[:1000]}\n\n"
                f"Follow-up question: {message}"
            ),
        },
    ]
    messages.extend(safe_history)

    client = Groq(api_key=settings.groq_api_key)

    response = await asyncio.to_thread(
        client.chat.completions.create,
        model=settings.groq_model,
        max_completion_tokens=1000,
        temperature=0.3,
        messages=messages,
    )

    ai_response = response.choices[0].message.content
    return {"response": ai_response}

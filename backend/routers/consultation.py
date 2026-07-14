import os
import uuid
import json
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Header
from services.stt_service import transcribe_audio
from services.ai_service import generate_full_consultation
from services.tts_service import generate_audio
from services.storage_service import upload_file
from services.db_service import save_consultation, save_consultation_image, save_consultation_audio, get_user_consultations, get_consultation
from services.product_service import generate_product_recommendations

router = APIRouter(prefix="/api/consultations", tags=["Consultations"])

TEMP_DIR = Path(__file__).resolve().parent.parent / "temp"
TEMP_DIR.mkdir(exist_ok=True)


@router.post("")
async def create_consultation(
    audio: UploadFile = File(..., description="Patient voice recording (MP3)"),
    image: UploadFile | None = File(None, description="Skin image (JPG/PNG)"),
    video: UploadFile | None = File(None, description="Skin video (MP4)"),
    x_user_id: str | None = Header(None, alias="X-User-Id"),
):
    if not image:
        raise HTTPException(status_code=400, detail="A skin image is required for analysis.")

    consult_id = str(uuid.uuid4())
    audio_path = TEMP_DIR / f"{consult_id}_audio.mp3"
    image_path = TEMP_DIR / f"{consult_id}_image.jpg"
    video_path = None

    audio_content = await audio.read()
    with open(audio_path, "wb") as f:
        f.write(audio_content)

    image_content = await image.read()
    with open(image_path, "wb") as f:
        f.write(image_content)

    if video:
        video_path = TEMP_DIR / f"{consult_id}_video.mp4"
        video_content = await video.read()
        with open(video_path, "wb") as f:
            f.write(video_content)

    try:
        patient_text = transcribe_audio(str(audio_path))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

    image_url = None
    try:
        image_url = await upload_file(str(image_path), "consultation-media", f"{consult_id}/image.jpg")
    except Exception:
        pass

    try:
        result = generate_full_consultation(
            patient_text=patient_text,
            image_filepath=str(image_path),
            video_filepath=str(video_path) if video_path else None,
        )
        doctor_response = result["doctor_response"]
        products_text = result.get("products_text", "")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

    audio_output_path = None
    try:
        audio_output_path = generate_audio(doctor_response)
    except Exception:
        pass

    audio_url = None
    if audio_output_path:
        try:
            audio_url = await upload_file(str(audio_output_path), "consultation-media", f"{consult_id}/response.mp3")
        except Exception:
            pass

    for p in [audio_path, image_path, video_path]:
        if p and p.exists():
            p.unlink()

    try:
        await save_consultation(
            user_id=x_user_id,
            patient_text=patient_text,
            doctor_response=doctor_response,
            severity=None,
            status="completed",
            image_url=image_url,
            audio_url=audio_url,
        )
    except Exception:
        pass

    return {
        "consultation_id": consult_id,
        "transcript": patient_text,
        "doctor_response": doctor_response,
        "products_text": products_text,
        "audio_url": audio_url,
        "image_url": image_url,
        "status": "completed",
    }


@router.get("")
async def list_consultations(x_user_id: str = Header(alias="X-User-Id")):
    consultations = await get_user_consultations(x_user_id)
    return consultations


@router.get("/{consultation_id}")
async def get_consultation_endpoint(consultation_id: str):
    consultation = await get_consultation(consultation_id)
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
    return consultation


@router.get("/{consultation_id}/report")
async def download_report(consultation_id: str):
    from services.report_service import generate_consultation_pdf

    consultation = await get_consultation(consultation_id)
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")

    pdf_bytes = generate_consultation_pdf(
        consultation_id=consultation["id"],
        patient_text=consultation["patient_text"],
        doctor_response=consultation["doctor_response"] or "No analysis available.",
        severity=consultation.get("severity"),
        created_at=consultation.get("created_at"),
        image_url=consultation.get("image_url"),
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

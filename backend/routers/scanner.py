"""Scanner router - AI Skin Scanner endpoints"""

import io
import uuid
import asyncio
import logging
from pathlib import Path
from datetime import datetime, timezone
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Header, Request
from PIL import Image
from rate_limit import limiter
from config import settings
from agents.scanner_agent import ScannerAgent, SCANNER_FEATURES
from agents.treatment_agent import TreatmentAgent
from services.db_service import save_consultation, save_consultation_image
from services.storage_service import upload_file
from services.tts_service import generate_audio
from services.report_service import generate_scanner_pdf

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/scanner", tags=["Scanner"])

TEMP_DIR = Path(__file__).resolve().parent.parent / "temp"
TEMP_DIR.mkdir(exist_ok=True)

MAX_IMAGE_SIZE = 10 * 1024 * 1024
MIN_DIMENSION = 100
SCAN_TIMEOUT = 100  # 2 minutes minus buffer for PDF/TTS
ANALYZE_FRAME_TIMEOUT = 15

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
scanner_agent = ScannerAgent()
treatment_agent = TreatmentAgent()


def _validate_image(content: bytes) -> None:
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


def _save_temp_image(content: bytes, ext: str = "jpg") -> Path:
    temp_path = TEMP_DIR / f"scanner_{uuid.uuid4()}.{ext}"
    with open(temp_path, "wb") as f:
        f.write(content)
    return temp_path


def _cleanup(path: Path | None):
    if path and path.exists():
        try:
            path.unlink()
        except OSError:
            pass


@router.get("/conditions")
@limiter.limit("60/hour")
async def get_scanner_conditions(request: Request):
    """Return the list of 17 skin features available for scanning."""
    return {"features": SCANNER_FEATURES}


@router.post("/analyze-frame")
@limiter.limit("240/hour")
async def analyze_frame(
    request: Request,
    image: UploadFile = File(...),
    x_user_id: str | None = Header(None, alias="X-User-Id"),
):
    """Quick camera frame analysis for guidance feedback (lighting, blur, distance, makeup, glasses)."""
    content = await image.read()
    _validate_image(content)

    ext = image.content_type.split("/")[-1] if image.content_type else "jpg"
    temp_path = _save_temp_image(content, ext)

    try:
        result = await asyncio.wait_for(
            asyncio.to_thread(scanner_agent.analyze_camera_frame, str(temp_path)),
            timeout=ANALYZE_FRAME_TIMEOUT,
        )
        return result
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Frame analysis timed out.")
    except Exception as e:
        logger.error(f"analyze_frame failed: {e}")
        raise HTTPException(status_code=500, detail="Frame analysis failed.")
    finally:
        _cleanup(temp_path)


@router.post("/analyze")
@limiter.limit("60/hour")
async def analyze_skin(
    request: Request,
    image: UploadFile = File(...),
    features: str | None = Form(None, description="Comma-separated feature IDs to detect"),
    patient_text: str | None = Form(None, description="Optional patient notes"),
    x_user_id: str | None = Header(None, alias="X-User-Id"),
):
    """Full skin analysis with selected features, treatment, PDF report, and audio."""
    content = await image.read()
    _validate_image(content)

    selected_features = None
    if features:
        selected_features = [f.strip() for f in features.split(",") if f.strip()]
        valid_ids = {f["id"] for f in SCANNER_FEATURES}
        selected_features = [f for f in selected_features if f in valid_ids]
        if not selected_features:
            selected_features = None

    ext = image.content_type.split("/")[-1] if image.content_type else "jpg"
    temp_path = _save_temp_image(content, ext)
    scan_id = str(uuid.uuid4())

    try:
        # Step 1: Detect skin features (streaming-friendly, runs in background)
        def _detect():
            return scanner_agent.detect_skin_features(str(temp_path), selected_features)

        # Step 2: Calculate skin score
        def _score(detections):
            return scanner_agent.calculate_skin_score(str(temp_path), detections)

        # Step 3: Generate treatment
        def _treat(detections, explanation):
            context = {"detections": detections, "explanation": explanation, "patient_text": patient_text or ""}
            return treatment_agent.process(context)
        loop = asyncio.get_event_loop()

        # Run detection first
        detection_result = await asyncio.wait_for(
            asyncio.to_thread(_detect),
            timeout=40,
        )
        detections = detection_result.get("detections", [])

        # Score
        skin_score = await asyncio.wait_for(
            asyncio.to_thread(_score, detections),
            timeout=20,
        )

        # Upload image to storage
        image_url = None
        storage_key = f"scanner/{scan_id}/photo.jpg"
        try:
            image_url = await upload_file(
                filepath=str(temp_path),
                bucket="consultation-media",
                key=storage_key,
            )
        except Exception as e:
            logger.warning(f"Image upload failed: {e}")

        # Build explanation from top detections
        explanation_parts = []
        for d in detections[:3]:
            explanation_parts.append(f"{d['feature']} ({d['severity']}): {d.get('description', '')[:150]}")
        explanation = ". ".join(explanation_parts) if explanation_parts else "No significant skin concerns detected. Skin appears healthy."

        # Treatment
        treatment_result = {"treatment": "Maintain a consistent skincare routine with gentle cleanser, moisturizer, and SPF 30+."}
        try:
            treatment_result = await asyncio.wait_for(
                asyncio.to_thread(_treat, detections, explanation),
                timeout=35,
            )
        except Exception:
            pass

        treatment_text = treatment_result.get("treatment", "")
        recommendations = treatment_result.get("recommendations", [])
        if detections:
            top = detections[0]
            patient_summary = f"{top['feature']} ({top['severity']}), {patient_text or ''}"[:300]
        else:
            patient_summary = patient_text or ""

        # Save to DB
        severity = "urgent" if any(d["severity"] in ("severe", "urgent") for d in detections) else \
                   "moderate" if any(d["severity"] == "moderate" for d in detections) else "mild"

        saved = await save_consultation(
            user_id=x_user_id,
            patient_text=patient_text or "AI Skin Scan",
            doctor_response=treatment_text,
            severity=severity,
            status="completed",
            image_url=image_url,
        )
        consultation_id = saved.get("id") if saved else scan_id

        if image_url and consultation_id:
            try:
                await save_consultation_image(
                    consultation_id=consultation_id,
                    storage_url=image_url,
                    storage_key=storage_key,
                )
            except Exception:
                pass

        # Generate audio summary
        audio_url = None
        audio_text = f"Scan complete. Skin score: {skin_score} out of 10. " + explanation[:200]
        try:
            audio_path = TEMP_DIR / f"scanner_{scan_id}.mp3"
            await asyncio.to_thread(generate_audio, audio_text, str(audio_path))
            audio_url = await upload_file(
                filepath=str(audio_path),
                bucket="consultation-media",
                key=f"scanner/{scan_id}/audio.mp3",
            )
            _cleanup(audio_path)
        except Exception as e:
            logger.warning(f"Audio generation failed: {e}")

        # Generate PDF report
        pdf_url = None
        try:
            pdf_bytes = generate_scanner_pdf(
                scan_id=consultation_id,
                detections=detections,
                explanation=explanation,
                treatment=treatment_text,
                recommendations=recommendations,
                skin_score=skin_score,
                image_url=image_url,
                created_at=datetime.now(timezone.utc).isoformat(),
                severity=severity,
            )
            pdf_path = TEMP_DIR / f"scanner_{scan_id}.pdf"
            with open(pdf_path, "wb") as f:
                f.write(pdf_bytes)
            pdf_url = await upload_file(
                filepath=str(pdf_path),
                bucket="consultation-media",
                key=f"scanner/{scan_id}/report.pdf",
            )
            _cleanup(pdf_path)
        except Exception as e:
            logger.warning(f"PDF generation failed: {e}")

        return {
            "scan_id": consultation_id,
            "detections": detections,
            "skin_score": skin_score,
            "severity": severity,
            "explanation": explanation,
            "treatment": treatment_text,
            "recommendations": recommendations,
            "image_url": image_url,
            "audio_url": audio_url,
            "pdf_url": pdf_url,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

    except asyncio.TimeoutError:
        logger.warning(f"Scanner timed out for scan {scan_id}")
        return {
            "scan_id": scan_id,
            "detections": [],
            "skin_score": 5.0,
            "severity": "mild",
            "explanation": "Analysis timed out. Please try again.",
            "treatment": "Please consult a dermatologist for professional advice.",
            "image_url": None,
            "audio_url": None,
            "pdf_url": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        logger.error(f"Scanner analyze failed: {e}")
        raise HTTPException(status_code=500, detail="AI analysis failed.")
    finally:
        _cleanup(temp_path)
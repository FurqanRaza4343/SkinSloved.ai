import asyncio
import logging
from fastapi import APIRouter, HTTPException, Header, Request
from rate_limit import limiter
from agents.routine_agent import SkinRoutineAgent

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/routine", tags=["Routine"])

ROUTINE_TIMEOUT = 20


@router.post("/generate")
@limiter.limit("10/hour")
async def generate_routine(request: Request, req_body: dict, x_user_id: str | None = Header(None, alias="X-User-Id")):
    patient_text = req_body.get("patient_text", "")
    detections = req_body.get("detections", [])
    skin_type = req_body.get("skin_type", "")
    severity = req_body.get("severity", "mild")

    if not patient_text and not detections:
        raise HTTPException(status_code=400, detail="patient_text or detections is required")

    agent = SkinRoutineAgent()
    context = {
        "patient_text": patient_text[:2000],
        "detections": detections,
        "skin_type": skin_type,
        "severity": severity,
    }

    try:
        result = await asyncio.wait_for(
            asyncio.to_thread(agent.process, context),
            timeout=ROUTINE_TIMEOUT,
        )
        routine = result.get("routine", {})
        return {"routine": routine, "status": "generated"}
    except asyncio.TimeoutError:
        logger.warning("Routine generation timed out")
        raise HTTPException(status_code=504, detail="Routine generation timed out. Please try again.")
    except Exception as e:
        logger.error(f"Routine generation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate routine")


@router.post("/save")
@limiter.limit("20/hour")
async def save_routine(request: Request, req_body: dict, x_user_id: str | None = Header(None, alias="X-User-Id")):
    from services.db_service import save_consultation

    routine_data = req_body.get("routine")
    label = req_body.get("label", "My Skin Routine")

    if not routine_data:
        raise HTTPException(status_code=400, detail="routine data is required")

    try:
        saved = await save_consultation(
            user_id=x_user_id,
            patient_text=f"[ROUTINE] {label}",
            doctor_response=str(routine_data),
            severity="mild",
            status="routine",
        )
        routine_id = saved.get("id") if saved else None
        return {"id": routine_id, "status": "saved"}
    except Exception as e:
        logger.error(f"Failed to save routine: {e}")
        raise HTTPException(status_code=500, detail="Failed to save routine")

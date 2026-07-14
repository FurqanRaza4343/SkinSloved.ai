from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ConsultationCreate(BaseModel):
    patient_text: str
    doctor_response: Optional[str] = None
    severity: Optional[str] = None  # mild, moderate, urgent


class ConsultationResponse(BaseModel):
    id: str
    patient_text: str
    doctor_response: Optional[str]
    severity: Optional[str]
    status: str
    created_at: datetime
    image_url: Optional[str] = None
    audio_url: Optional[str] = None


class ConsultationRequest(BaseModel):
    audio_url: Optional[str] = None
    image_data: Optional[str] = None  # base64 encoded
    video_data: Optional[str] = None

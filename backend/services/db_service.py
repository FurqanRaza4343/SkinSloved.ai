"""Database service for InsForge PostgREST operations"""

import uuid
import httpx
from typing import Any
from config import settings

REST_URL = f"{settings.insforge_url}/api/rest/v1"


def _admin_headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.insforge_api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


async def save_consultation(
    user_id: str | None,
    patient_text: str,
    doctor_response: str | None = None,
    severity: str | None = None,
    status: str = "completed",
    image_url: str | None = None,
    audio_url: str | None = None,
) -> dict[str, Any] | None:
    """Save a consultation record and return the saved record."""
    payload = {
        "user_id": user_id or "00000000-0000-0000-0000-000000000000",
        "patient_text": patient_text,
        "doctor_response": doctor_response,
        "severity": severity,
        "status": status,
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{REST_URL}/consultations",
            json=payload,
            headers=_admin_headers(),
        )
        response.raise_for_status()
        result = response.json()
        return result[0] if isinstance(result, list) and result else result


async def save_consultation_image(consultation_id: str, image_url: str) -> dict[str, Any] | None:
    payload = {
        "consultation_id": consultation_id,
        "image_url": image_url,
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{REST_URL}/consultation_images",
            json=payload,
            headers=_admin_headers(),
        )
        response.raise_for_status()
        return response.json()


async def save_consultation_audio(consultation_id: str, audio_url: str) -> dict[str, Any] | None:
    payload = {
        "consultation_id": consultation_id,
        "audio_url": audio_url,
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{REST_URL}/consultation_audios",
            json=payload,
            headers=_admin_headers(),
        )
        response.raise_for_status()
        return response.json()


async def get_user_consultations(user_id: str) -> list[dict[str, Any]]:
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{REST_URL}/consultations",
            params={"user_id": f"eq.{user_id}", "order": "created_at.desc"},
            headers=_admin_headers(),
        )
        response.raise_for_status()
        return response.json()


async def get_consultation(consultation_id: str) -> dict[str, Any] | None:
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{REST_URL}/consultations",
            params={"id": f"eq.{consultation_id}"},
            headers=_admin_headers(),
        )
        response.raise_for_status()
        data = response.json()
        return data[0] if data else None


async def save_user_profile(auth_user_id: str, display_name: str | None = None, email: str | None = None):
    payload = {
        "auth_user_id": auth_user_id,
        "display_name": display_name,
        "email": email,
    }
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{REST_URL}/user_profiles",
                json=payload,
                headers=_admin_headers(),
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 409:
                pass
            else:
                raise

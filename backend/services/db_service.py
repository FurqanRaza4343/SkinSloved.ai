"""Database service for InsForge PostgREST operations"""

import uuid
import httpx
from typing import Any
from config import settings

REST_URL = f"{settings.insforge_url}/api/database/records"


def _admin_headers(prefer: str = "return=representation") -> dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.insforge_api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Prefer": prefer,
    }


async def save_consultation(
    user_id: str | None,
    patient_text: str,
    doctor_response: str | None = None,
    severity: str | None = None,
    status: str = "completed",
    image_url: str | None = None,
    audio_url: str | None = None,
    consultation_id: str | None = None,
) -> dict[str, Any] | None:
    """Save a consultation record and return the saved record."""
    payload: dict[str, Any] = {
        "user_id": user_id,
        "patient_text": patient_text,
        "doctor_response": doctor_response,
        "severity": severity,
        "status": status,
    }
    if consultation_id:
        payload["id"] = consultation_id

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{REST_URL}/consultations",
            json=payload,
            headers=_admin_headers(),
        )
        response.raise_for_status()
        result = response.json()
        return result[0] if isinstance(result, list) and result else result


async def save_consultation_image(consultation_id: str, storage_url: str, storage_key: str = "", media_type: str = "image/jpeg") -> dict[str, Any] | None:
    payload = {
        "consultation_id": consultation_id,
        "storage_url": storage_url,
        "storage_key": storage_key or f"{consultation_id}/image.jpg",
        "media_type": media_type,
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


async def get_consultation_images(consultation_id: str) -> list[dict[str, Any]]:
    """Fetch all images for a consultation."""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{REST_URL}/consultation_images",
                params={"consultation_id": f"eq.{consultation_id}"},
                headers=_admin_headers(),
            )
            response.raise_for_status()
            return response.json()
        except Exception:
            return []


async def get_user_consultations_with_images(user_id: str) -> list[dict[str, Any]]:
    """Fetch consultations with their first image URL attached."""
    consultations = await get_user_consultations(user_id)
    if not consultations:
        return []
    for c in consultations:
        c["image_url"] = None
        c["audio_url"] = None
        try:
            images = await get_consultation_images(c["id"])
            if images:
                c["image_url"] = images[0].get("storage_url")
        except Exception:
            pass
    return consultations


async def get_consultations_by_ids(ids: list[str]) -> list[dict[str, Any]]:
    """Fetch multiple consultations by their IDs."""
    if not ids:
        return []
    async with httpx.AsyncClient() as client:
        ids_param = ",".join(ids)
        response = await client.get(
            f"{REST_URL}/consultations",
            params={"id": f"in.({ids_param})", "order": "created_at.asc"},
            headers=_admin_headers(),
        )
        response.raise_for_status()
        consultations = response.json()
    for c in consultations:
        c["image_url"] = None
        try:
            images = await get_consultation_images(c["id"])
            if images:
                c["image_url"] = images[0].get("storage_url")
        except Exception:
            pass
    return consultations


async def get_consultation_with_images(consultation_id: str) -> dict[str, Any] | None:
    """Fetch a single consultation with its first image URL."""
    c = await get_consultation(consultation_id)
    if not c:
        return None
    c["image_url"] = None
    c["audio_url"] = None
    try:
        images = await get_consultation_images(consultation_id)
        if images:
            c["image_url"] = images[0].get("storage_url")
    except Exception:
        pass
    return c


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

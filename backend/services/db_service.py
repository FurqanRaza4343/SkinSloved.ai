"""Database service for InsForge PostgREST operations"""

import uuid
import httpx
import logging
from typing import Any
from config import settings

logger = logging.getLogger(__name__)

REST_URL = f"{settings.insforge_url}/api/database/records"

_http_client: httpx.AsyncClient | None = None


async def _get_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0, connect=10.0),
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
        )
    return _http_client


def _admin_headers(prefer: str = "return=representation") -> dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.insforge_api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Prefer": prefer,
    }


async def _resolve_profile_id(user_id: str | None) -> str | None:
    """Resolve an auth user id to a user_profiles.id, auto-creating the profile if needed."""
    if not user_id:
        return None
    try:
        client = await _get_client()
        response = await client.get(
            f"{REST_URL}/user_profiles",
            params={"auth_user_id": f"eq.{user_id}", "select": "id"},
            headers=_admin_headers("return=minimal"),
        )
        response.raise_for_status()
        rows = response.json()
        if rows:
            return rows[0]["id"]
    except Exception as e:
        logger.warning(f"resolve_profile lookup failed: {e}")
        return None

    profile_id = str(uuid.uuid4())
    try:
        await save_user_profile(auth_user_id=user_id, display_name=None, email=None, profile_id=profile_id)
        return profile_id
    except Exception as e:
        logger.warning(f"auto-create user profile failed: {e}")
        return None


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
    profile_id = await _resolve_profile_id(user_id)
    payload: dict[str, Any] = {
        "user_id": profile_id,
        "patient_text": patient_text,
        "doctor_response": doctor_response,
        "severity": severity,
        "status": status,
    }
    if consultation_id:
        payload["id"] = consultation_id

    try:
        client = await _get_client()
        response = await client.post(
            f"{REST_URL}/consultations",
            json=payload,
            headers=_admin_headers(),
        )
        response.raise_for_status()
        result = response.json()
        return result[0] if isinstance(result, list) and result else result
    except httpx.HTTPStatusError as e:
        logger.error(f"save_consultation HTTP {e.response.status_code}: {e.response.text[:200]}")
        raise
    except Exception as e:
        logger.error(f"save_consultation failed: {e}")
        raise


async def save_consultation_image(consultation_id: str, storage_url: str, storage_key: str = "", media_type: str = "image/jpeg") -> dict[str, Any] | None:
    payload = {
        "consultation_id": consultation_id,
        "storage_url": storage_url,
        "storage_key": storage_key or f"{consultation_id}/image.jpg",
        "media_type": media_type,
    }
    try:
        client = await _get_client()
        response = await client.post(
            f"{REST_URL}/consultation_images",
            json=payload,
            headers=_admin_headers(),
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.error(f"save_consultation_image failed: {e}")
        return None


async def save_consultation_audio(consultation_id: str, audio_url: str) -> dict[str, Any] | None:
    payload = {
        "consultation_id": consultation_id,
        "audio_url": audio_url,
    }
    try:
        client = await _get_client()
        response = await client.post(
            f"{REST_URL}/consultation_audios",
            json=payload,
            headers=_admin_headers(),
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.error(f"save_consultation_audio failed: {e}")
        return None


async def get_user_consultations(user_id: str) -> list[dict[str, Any]]:
    try:
        client = await _get_client()
        response = await client.get(
            f"{REST_URL}/consultations",
            params={"user_id": f"eq.{user_id}", "order": "created_at.desc"},
            headers=_admin_headers(),
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.error(f"get_user_consultations failed: {e}")
        return []


async def get_consultation(consultation_id: str) -> dict[str, Any] | None:
    try:
        client = await _get_client()
        response = await client.get(
            f"{REST_URL}/consultations",
            params={"id": f"eq.{consultation_id}"},
            headers=_admin_headers(),
        )
        response.raise_for_status()
        data = response.json()
        return data[0] if data else None
    except Exception as e:
        logger.error(f"get_consultation failed: {e}")
        return None


async def get_consultation_images(consultation_id: str) -> list[dict[str, Any]]:
    """Fetch all images for a consultation."""
    try:
        client = await _get_client()
        response = await client.get(
            f"{REST_URL}/consultation_images",
            params={"consultation_id": f"eq.{consultation_id}"},
            headers=_admin_headers(),
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.warning(f"Failed to fetch consultation images: {e}")
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
        except Exception as e:
            logger.warning(f"Failed to fetch image for consultation {c.get('id')}: {e}")
    return consultations


async def get_consultations_by_ids(ids: list[str]) -> list[dict[str, Any]]:
    """Fetch multiple consultations by their IDs."""
    if not ids:
        return []
    try:
        client = await _get_client()
        ids_param = ",".join(ids)
        response = await client.get(
            f"{REST_URL}/consultations",
            params={"id": f"in.({ids_param})", "order": "created_at.asc"},
            headers=_admin_headers(),
        )
        response.raise_for_status()
        consultations = response.json()
    except Exception as e:
        logger.error(f"get_consultations_by_ids failed: {e}")
        return []
    for c in consultations:
        c["image_url"] = None
        try:
            images = await get_consultation_images(c["id"])
            if images:
                c["image_url"] = images[0].get("storage_url")
        except Exception as e:
            logger.warning(f"Failed to fetch image for consultation {c.get('id')}: {e}")
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
    except Exception as e:
        logger.warning(f"Failed to fetch image for consultation {consultation_id}: {e}")
    return c


async def save_user_profile(auth_user_id: str, display_name: str | None = None, email: str | None = None, profile_id: str | None = None):
    payload = {
        "auth_user_id": auth_user_id,
        "display_name": display_name,
        "email": email,
    }
    if profile_id:
        payload["id"] = profile_id
    try:
        client = await _get_client()
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
            logger.error(f"save_user_profile HTTP {e.response.status_code}: {e.response.text[:200]}")
            raise
    except Exception as e:
        logger.error(f"save_user_profile failed: {e}")
        raise

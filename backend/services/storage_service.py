"""Storage service using InsForge Storage REST API"""

import os
import httpx
from config import settings


async def upload_file(filepath: str, bucket: str, key: str) -> str:
    """Upload a file to InsForge Storage and return the public URL."""
    with open(filepath, "rb") as f:
        data = f.read()

    headers = {"Authorization": f"Bearer {settings.insforge_api_key}"}

    async with httpx.AsyncClient(timeout=30.0) as client:
        upload_response = await client.put(
            f"{settings.insforge_url}/api/storage/buckets/{bucket}/objects/{key}",
            files={"file": (os.path.basename(key), data)},
            headers=headers,
        )
        upload_response.raise_for_status()

        strategy_response = await client.get(
            f"{settings.insforge_url}/api/storage/buckets/{bucket}/download-strategy/objects/{key}",
            headers=headers,
        )
        strategy_response.raise_for_status()
        url = strategy_response.json()["url"]
        return url if url.startswith("http") else f"{settings.insforge_url}{url}"


async def delete_file(bucket: str, key: str) -> None:
    """Delete a file from InsForge Storage."""
    async with httpx.AsyncClient() as client:
        response = await client.delete(
            f"{settings.insforge_url}/api/storage/buckets/{bucket}/objects/{key}",
            headers={"Authorization": f"Bearer {settings.insforge_api_key}"},
        )
        response.raise_for_status()

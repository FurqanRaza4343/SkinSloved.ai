"""Storage service using InsForge Storage SDK"""

import os
import httpx
from config import settings


async def upload_file(filepath: str, bucket: str, key: str) -> str:
    """Upload a file to InsForge Storage and return the public URL."""
    url = f"{settings.insforge_url}/storage/v1/object/{bucket}/{key}"

    async with httpx.AsyncClient() as client:
        with open(filepath, "rb") as f:
            response = await client.put(
                url,
                content=f,
                headers={
                    "Authorization": f"Bearer {settings.insforge_anon_key}",
                    "Content-Type": "application/octet-stream",
                },
            )
        response.raise_for_status()
        return f"{settings.insforge_url}/storage/v1/object/public/{bucket}/{key}"


async def delete_file(bucket: str, key: str) -> None:
    """Delete a file from InsForge Storage."""
    url = f"{settings.insforge_url}/storage/v1/object/{bucket}/{key}"

    async with httpx.AsyncClient() as client:
        response = await client.delete(
            url,
            headers={"Authorization": f"Bearer {settings.insforge_anon_key}"},
        )
        response.raise_for_status()

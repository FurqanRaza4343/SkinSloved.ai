"""Speech-to-Text service using Groq Whisper"""

import os
import asyncio
import logging
from groq import Groq
from config import settings

logger = logging.getLogger(__name__)

STT_TIMEOUT = 15


def _transcribe(audio_filepath: str) -> str:
    groq_api_key = settings.groq_api_key or os.environ.get("GROQ_API_KEY")
    if not groq_api_key:
        raise ValueError("Missing GROQ_API_KEY")

    client = Groq(api_key=groq_api_key)
    with open(audio_filepath, "rb") as audio_file:
        transcription = client.audio.transcriptions.create(
            file=audio_file,
            model=settings.whisper_model,
        )
    return transcription.text


def transcribe_audio(audio_filepath: str) -> str:
    return _transcribe(audio_filepath)


async def transcribe_audio_safe(audio_filepath: str) -> str:
    try:
        result = await asyncio.wait_for(
            asyncio.to_thread(_transcribe, audio_filepath),
            timeout=STT_TIMEOUT,
        )
        return result
    except asyncio.TimeoutError:
        logger.warning(f"STT timed out after {STT_TIMEOUT}s")
        return "Transcription timed out. Please try again."
    except Exception as e:
        logger.error(f"STT failed: {e}")
        return "Transcription failed."

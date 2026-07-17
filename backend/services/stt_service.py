"""Speech-to-Text service using Groq Whisper"""

import os
from groq import Groq
from config import settings


def transcribe_audio(audio_filepath: str) -> str:
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

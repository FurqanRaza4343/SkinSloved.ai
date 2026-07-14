"""Text-to-Speech service using Deepgram"""

import os
from pathlib import Path
from deepgram import DeepgramClient
from config import settings

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_OUTPUT = BASE_DIR / "temp" / "doctor_response.mp3"


def generate_audio(text: str, output_filepath: str | None = None) -> str:
    deepgram_api_key = settings.deepgram_api_key or os.environ.get("DEEPGRAM_API_KEY")
    if not deepgram_api_key:
        raise ValueError("Missing DEEPGRAM_API_KEY")

    output_path = Path(output_filepath) if output_filepath else DEFAULT_OUTPUT
    output_path.parent.mkdir(parents=True, exist_ok=True)

    deepgram = DeepgramClient(api_key=deepgram_api_key)
    audio = deepgram.speak.v1.audio.generate(
        text=text,
        model=settings.deepgram_tts_model,
        encoding="mp3",
    )

    with open(output_path, "wb") as file:
        for chunk in audio:
            file.write(chunk)

    return str(output_path)

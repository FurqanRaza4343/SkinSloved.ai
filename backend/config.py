import os
from dotenv import load_dotenv

# Load parent .env file
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))


class Settings:
    # InsForge
    insforge_url: str = os.getenv("INSFORGE_URL", "https://sncey5ds.ap-southeast.insforge.app")
    insforge_api_key: str = os.getenv("INSFORGE_API_KEY", "")
    insforge_anon_key: str = os.getenv("INSFORGE_ANON_KEY", "")

    # Groq
    groq_api_key: str = os.getenv("GROQ_API_KEY", "")
    whisper_model: str = os.getenv("WHISPER_MODEL", "whisper-large-v3")
    groq_model: str = os.getenv("GROQ_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct")

    # Deepgram
    deepgram_api_key: str = os.getenv("DEEPGRAM_API_KEY", "")
    deepgram_tts_model: str = os.getenv("DEEPGRAM_TTS_MODEL", "aura-2-thalia-en")

    # Mistral (optional fallback)
    mistral_api_key: str = os.getenv("MISTRAL_API_KEY", "")
    mistral_model: str = os.getenv("MISTRAL_MODEL", "mistral-large-latest")

    # CORS - allow frontend
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "https://sncey5ds.ap-southeast.insforge.app",
    ]


settings = Settings()

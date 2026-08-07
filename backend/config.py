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
    groq_model: str = os.getenv("GROQ_MODEL", "qwen/qwen3.6-27b")
    groq_vision_model: str = os.getenv("GROQ_VISION_MODEL", "llama-4-scout-17b-16e-instruct")

    # Deepgram
    deepgram_api_key: str = os.getenv("DEEPGRAM_API_KEY", "")
    deepgram_tts_model: str = os.getenv("DEEPGRAM_TTS_MODEL", "aura-2-thalia-en")

    # Mistral (vision + optional fallback)
    mistral_api_key: str = os.getenv("MISTRAL_API_KEY", "")
    mistral_model: str = os.getenv("MISTRAL_MODEL", "mistral-large-latest")
    mistral_vision_model: str = os.getenv("MISTRAL_VISION_MODEL", "pixtral-12b-2409")

    # Google Custom Search (optional, for product images)
    google_cse_api_key: str = os.getenv("GOOGLE_CSE_API_KEY", "")
    google_cse_cx: str = os.getenv("GOOGLE_CSE_CX", "")

    # CORS - allow frontend origins only (comma-separated in CORS_ORIGINS env var, or defaults)
    # NOTE: keep allow_credentials=True paired with an explicit origin allowlist (no "*").
    _cors_env = os.getenv("CORS_ORIGINS", "")
    cors_origins: list[str] = (
        [o.strip() for o in _cors_env.split(",") if o.strip()]
        if _cors_env
        else [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "https://sncey5ds.ap-southeast.insforge.app",
            "https://sncey5ds.insforge.site",
            "https://skinsolve.insforge.site",
        ]
    )


settings = Settings()

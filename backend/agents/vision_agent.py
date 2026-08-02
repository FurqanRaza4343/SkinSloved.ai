import base64
import logging
from io import BytesIO
from PIL import Image
from groq import Groq
from config import settings
from .base_agent import BaseAgent

logger = logging.getLogger(__name__)


class VisionAgent(BaseAgent):
    name = "vision"

    def _encode_image(self, filepath: str) -> str:
        image = Image.open(filepath)
        image.thumbnail((512, 512))
        buffer = BytesIO()
        image.convert("RGB").save(buffer, format="JPEG", quality=60)
        return base64.b64encode(buffer.getvalue()).decode("utf-8")

    def _call_groq(self, image_data: str, prompt: str) -> str:
        client = Groq(api_key=settings.groq_api_key)
        response = client.chat.completions.create(
            model=settings.groq_model,
            max_completion_tokens=500,
            reasoning_effort="none",
            messages=[
                {"role": "system", "content": "You are an expert dermatology image analyst. Provide detailed, objective visual descriptions."},
                {"role": "user", "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_data}"}},
                ]},
            ],
        )
        return response.choices[0].message.content

    def process(self, context: dict) -> dict:
        image_path = context.get("image_path")
        if not image_path:
            return {"image_description": None, "error": "No image provided"}

        image_data = self._encode_image(image_path)

        prompt = (
            "Analyze this skin image briefly:\n"
            "1. Body area shown\n"
            "2. Skin conditions visible (redness, lesions, bumps, discoloration)\n"
            "3. Size/color of any lesions\n"
            "Keep response under 200 words."
        )

        try:
            result = self._call_groq(image_data, prompt)
            return {"image_description": result}
        except Exception as e:
            logger.error(f"Vision analysis failed: {e}")
            return {"image_description": "Image analysis failed. Proceeding with patient description only."}

import base64
from io import BytesIO
from PIL import Image
from groq import Groq
from config import settings
from .base_agent import BaseAgent


class VisionAgent(BaseAgent):
    name = "vision"

    def _encode_image(self, filepath: str) -> str:
        image = Image.open(filepath)
        image.thumbnail((1024, 1024))
        buffer = BytesIO()
        image.convert("RGB").save(buffer, format="JPEG", quality=75)
        return base64.b64encode(buffer.getvalue()).decode("utf-8")

    def process(self, context: dict) -> dict:
        image_path = context.get("image_path")
        video_path = context.get("video_path")
        if not image_path:
            return {"image_description": None, "error": "No image provided"}

        image_data = self._encode_image(image_path)
        client = Groq(api_key=settings.groq_api_key)

        prompt = (
            "You are a dermatology vision AI. Analyze the skin image and describe in detail:\n"
            "1. What area of the body is shown?\n"
            "2. What skin conditions or abnormalities do you see? (lesions, redness, swelling, discoloration, texture changes, etc.)\n"
            "3. What is the color, size, shape, and distribution of any lesions?\n"
            "4. Are there any signs of inflammation, infection, or scarring?\n"
            "Respond in a clear, structured medical description."
        )
        if video_path:
            prompt += "\n\nThe patient also uploaded a video. Base your visual analysis on this image."

        response = client.chat.completions.create(
            model=settings.groq_model,
            max_completion_tokens=800,
            messages=[
                {"role": "system", "content": "You are an expert dermatology image analyst. Provide detailed, objective visual descriptions."},
                {"role": "user", "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_data}"}},
                ]},
            ],
        )

        return {"image_description": response.choices[0].message.content}

import logging
from groq import Groq
from config import settings
from .base_agent import BaseAgent

logger = logging.getLogger(__name__)


class TreatmentAgent(BaseAgent):
    name = "treatment"

    def _call_groq(self, prompt: str) -> str:
        client = Groq(api_key=settings.groq_api_key)
        response = client.chat.completions.create(
            model=settings.groq_model,
            max_completion_tokens=400,
            reasoning_effort="none",
            messages=[
                {"role": "system", "content": "Expert dermatologist providing concise treatment advice."},
                {"role": "user", "content": prompt},
            ],
        )
        return response.choices[0].message.content

    def process(self, context: dict) -> dict:
        patient_text = context.get("patient_text", "")
        detections = context.get("detections", [])
        explanation = context.get("explanation", "")

        fallback = "General skin care: Keep skin clean, moisturized, and protected with SPF 30+ daily. Consult a dermatologist for persistent concerns."

        if not detections:
            return {"treatment": fallback}

        top = detections[0]
        disease = top.get("disease", "skin condition")
        severity = top.get("severity", "mild")

        prompt = (
            f"Patient has {disease} ({severity}).\n"
            f"Description: {patient_text[:500]}\n"
            f"Analysis: {explanation[:300]}\n\n"
            "Provide 3-5 sentences: immediate care, lifestyle tips, when to see dermatologist. No markdown."
        )

        try:
            result = self._call_groq(prompt)
            return {"treatment": result}
        except Exception as e:
            logger.error(f"Treatment failed: {e}")
            return {"treatment": fallback}

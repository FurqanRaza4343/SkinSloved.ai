from groq import Groq
from config import settings
from .base_agent import BaseAgent


class TreatmentAgent(BaseAgent):
    name = "treatment"

    def process(self, context: dict) -> dict:
        patient_text = context.get("patient_text", "")
        detections = context.get("detections", [])
        explanation = context.get("explanation", "")

        if not detections:
            return {"treatment": "General skin care: Keep skin clean, moisturized, and protected with SPF."}

        top = detections[0]
        disease = top["disease"]
        severity = top["severity"]

        client = Groq(api_key=settings.groq_api_key)

        prompt = (
            f"You are a board-certified dermatologist. A patient has been diagnosed with {disease} ({severity} severity).\n\n"
            f"Patient description: {patient_text}\n"
            f"AI explanation: {explanation}\n\n"
            "Provide a treatment plan in 3-5 sentences covering:\n"
            "1. Immediate care recommendations\n"
            "2. Lifestyle/diet adjustments if relevant\n"
            "3. When to see a real dermatologist\n\n"
            "Do NOT use markdown or special characters. Be clear and reassuring."
        )

        response = client.chat.completions.create(
            model=settings.groq_model,
            max_completion_tokens=600,
            messages=[
                {"role": "system", "content": "You are a caring, expert dermatologist providing personalized treatment advice."},
                {"role": "user", "content": prompt},
            ],
        )

        return {"treatment": response.choices[0].message.content}

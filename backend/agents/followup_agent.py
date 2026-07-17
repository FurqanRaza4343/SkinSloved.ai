import json
from groq import Groq
from config import settings
from .base_agent import BaseAgent


class FollowUpAgent(BaseAgent):
    name = "followup"

    def generate_questions(self, patient_text: str) -> list[str]:
        client = Groq(api_key=settings.groq_api_key)

        prompt = (
            "You are a dermatology AI. A patient has described their skin concern. "
            "Generate exactly 4-6 concise follow-up questions a dermatologist would ask to make a more accurate assessment.\n\n"
            f"Patient's description: \"{patient_text}\"\n\n"
            "Focus on: duration, symptoms (pain, itching, burning), location, triggers, "
            "previous treatments, skincare routine, lifestyle factors, medical history.\n\n"
            "Return ONLY a JSON array of strings (no markdown, no numbering). "
            'Example: ["How long have you had this?", "Does it itch or burn?", "What products do you use on your face?"]'
        )

        response = client.chat.completions.create(
            model=settings.groq_model,
            max_completion_tokens=500,
            messages=[
                {"role": "system", "content": "You generate short, relevant dermatology follow-up questions as a JSON array."},
                {"role": "user", "content": prompt},
            ],
        )

        content = response.choices[0].message.content.strip()
        try:
            questions = json.loads(content)
            if not isinstance(questions, list):
                questions = ["How long have you had this skin concern?"]
        except (json.JSONDecodeError, TypeError):
            questions = ["How long have you had this skin concern?"]

        return questions[:6]

    def process(self, context: dict) -> dict:
        patient_text = context.get("patient_text", "")
        if not patient_text:
            return {"questions": ["Please describe your skin concern."]}
        questions = self.generate_questions(patient_text)
        return {"questions": questions}

import json
import asyncio
import logging
from groq import Groq
from config import settings
from .base_agent import BaseAgent

logger = logging.getLogger(__name__)

FOLLOWUP_TIMEOUT = 10
DEFAULT_QUESTIONS = [
    "How long have you had this skin concern?",
    "Does it itch, burn, or hurt?",
    "What products do you currently use on your skin?",
    "Have you tried any treatments before?",
]

FALLBACK_QUESTIONS = [
    "How long have you had this?",
    "Does it itch or burn?",
    "What products do you use?",
    "Any allergies or medical conditions?",
]


class FollowUpAgent(BaseAgent):
    name = "followup"

    def _call_groq(self, patient_text: str) -> str:
        client = Groq(api_key=settings.groq_api_key)
        prompt = (
            "Generate 4 concise follow-up questions for a dermatology patient.\n"
            f"Patient said: \"{patient_text[:500]}\"\n\n"
            "Return ONLY a JSON array of strings."
        )
        response = client.chat.completions.create(
            model=settings.groq_model,
            max_completion_tokens=300,
            messages=[
                {"role": "system", "content": "Generate dermatology follow-up questions as JSON array."},
                {"role": "user", "content": prompt},
            ],
        )
        return response.choices[0].message.content.strip()

    def generate_questions(self, patient_text: str) -> list[str]:
        if not patient_text:
            return DEFAULT_QUESTIONS

        try:
            content = asyncio.wait_for(
                asyncio.to_thread(self._call_groq, patient_text),
                timeout=FOLLOWUP_TIMEOUT,
            )
            questions = json.loads(content)
            if isinstance(questions, list) and len(questions) > 0:
                return [str(q) for q in questions[:6]]
        except asyncio.TimeoutError:
            logger.warning(f"Followup questions timed out after {FOLLOWUP_TIMEOUT}s")
        except (json.JSONDecodeError, TypeError):
            pass
        except Exception as e:
            logger.error(f"Followup questions failed: {e}")

        return FALLBACK_QUESTIONS

    def process(self, context: dict) -> dict:
        patient_text = context.get("patient_text", "")
        questions = self.generate_questions(patient_text)
        return {"questions": questions}

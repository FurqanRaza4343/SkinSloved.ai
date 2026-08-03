import json
import logging
from groq import Groq
from config import settings
from .base_agent import BaseAgent

logger = logging.getLogger(__name__)

ROUTINE_SYSTEM_PROMPT = """You are an expert dermatological skin care routine advisor. Generate a personalized daily skin care routine based on the patient's skin condition, severity, and concerns.

Return ONLY a valid JSON object with this exact structure:
{
  "skin_type_analysis": "Brief 1-2 sentence analysis of the user's skin type and concerns",
  "morning": [
    {"step": 1, "product": "Product Name", "category": "cleanser|toner|serum|moisturizer|sunscreen|treatment", "instruction": "How to apply", "duration": "30 seconds|1 minute|2 minutes", "tips": "Optional tip"}
  ],
  "evening": [
    {"step": 1, "product": "Product Name", "category": "cleanser|toner|serum|moisturizer|treatment|mask", "instruction": "How to apply", "duration": "30 seconds|1 minute|2 minutes", "tips": "Optional tip"}
  ],
  "weekly": [
    {"day": "Monday", "task": "Exfoliate with BHA", "duration": "5 minutes"}
  ],
  "important_notes": ["Note 1", "Note 2"],
  "ingredients_to_avoid": ["Ingredient 1", "Ingredient 2"],
  "recommended_ingredients": ["Ingredient 1", "Ingredient 2"]
}

Rules:
- Morning routine: 4-6 steps (cleanser → toner → serum → moisturizer → sunscreen)
- Evening routine: 4-6 steps (double cleanse → treatment → serum → moisturizer)
- Weekly tasks: 2-3 items (exfoliation, mask, etc.)
- Be specific to the condition (acne needs salicylic acid, rosacea needs gentle products, etc.)
- Sunscreen is ALWAYS mandatory in morning
- Include practical timing estimates
- Keep product names realistic and commonly available
- Never recommend harsh products for sensitive/irritated skin"""

FALLBACK_ROUTINE = {
    "skin_type_analysis": "Please consult a dermatologist for a personalized routine analysis.",
    "morning": [
        {"step": 1, "product": "Gentle Cleanser", "category": "cleanser", "instruction": "Massage onto damp skin for 60 seconds, rinse with lukewarm water", "duration": "1 minute", "tips": "Use lukewarm water, never hot"},
        {"step": 2, "product": "Moisturizer", "category": "moisturizer", "instruction": "Apply to slightly damp skin in upward motions", "duration": "30 seconds", "tips": "Choose based on your skin type"},
        {"step": 3, "product": "Sunscreen SPF 30+", "category": "sunscreen", "instruction": "Apply generously to face, neck, and ears. Reapply every 2 hours", "duration": "1 minute", "tips": "Non-negotiable step, even on cloudy days"},
    ],
    "evening": [
        {"step": 1, "product": "Gentle Cleanser", "category": "cleanser", "instruction": "Double cleanse if wearing makeup/sunscreen", "duration": "1 minute", "tips": "First cleanse removes surface, second cleanses skin"},
        {"step": 2, "product": "Moisturizer", "category": "moisturizer", "instruction": "Apply to clean skin before bed", "duration": "30 seconds", "tips": "Nighttime is when skin repairs itself"},
    ],
    "weekly": [
        {"day": "Wednesday", "task": "Gentle exfoliation", "duration": "3 minutes"},
        {"day": "Sunday", "task": "Hydrating mask", "duration": "10 minutes"},
    ],
    "important_notes": [
        "Always patch test new products",
        "Introduce one new product at a time",
        "Consistency is key - results take 4-6 weeks"
    ],
    "ingredients_to_avoid": ["Alcohol denat", "Fragrance", "SLS"],
    "recommended_ingredients": ["Hyaluronic Acid", "Niacinamide", "Ceramides"]
}


class SkinRoutineAgent(BaseAgent):
    name = "routine"

    def _call_groq(self, prompt: str) -> str:
        client = Groq(api_key=settings.groq_api_key)
        response = client.chat.completions.create(
            model=settings.groq_model,
            max_completion_tokens=1500,
            reasoning_effort="none",
            messages=[
                {"role": "system", "content": ROUTINE_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
        )
        return response.choices[0].message.content

    def process(self, context: dict) -> dict:
        patient_text = context.get("patient_text", "")
        detections = context.get("detections", [])
        skin_type = context.get("skin_type", "")
        severity = context.get("severity", "mild")

        top_condition = "general skin care"
        if detections:
            top = detections[0] if isinstance(detections, list) else detections
            top_condition = top.get("disease", "skin condition") if isinstance(top, dict) else str(top)

        prompt = (
            f"Patient's skin condition: {top_condition}\n"
            f"Severity: {severity}\n"
            f"Patient description: {patient_text[:500]}\n"
            f"Skin type: {skin_type or 'not specified'}\n\n"
            "Generate a personalized daily skin care routine for this patient."
        )

        try:
            result = self._call_groq(prompt)
            if "```json" in result:
                result = result.split("```json")[1].split("```")[0].strip()
            elif "```" in result:
                result = result.split("```")[1].split("```")[0].strip()
            routine = json.loads(result)
            return {"routine": routine}
        except (json.JSONDecodeError, IndexError):
            try:
                start = result.index("{")
                end = result.rindex("}") + 1
                routine = json.loads(result[start:end])
                return {"routine": routine}
            except (ValueError, json.JSONDecodeError):
                logger.warning("Failed to parse routine JSON, using fallback")
                return {"routine": FALLBACK_ROUTINE}
        except Exception as e:
            logger.error(f"Routine generation failed: {e}")
            return {"routine": FALLBACK_ROUTINE}

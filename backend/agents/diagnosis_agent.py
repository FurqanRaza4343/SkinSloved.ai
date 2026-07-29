import json
import re
import logging
from groq import Groq
from config import settings
from .base_agent import BaseAgent

logger = logging.getLogger(__name__)

DISEASE_LIST = [
    "Acne Vulgaris", "Rosacea", "Eczema (Atopic Dermatitis)", "Psoriasis",
    "Melasma", "Vitiligo", "Ringworm (Tinea Corporis)", "Fungal Infection",
    "Cold Sores (Herpes Simplex)", "Contact Dermatitis", "Seborrheic Dermatitis",
    "Keratosis Pilaris", "Hives (Urticaria)", "Sunburn", "Skin Cancer Suspicion",
    "Perioral Dermatitis", "Folliculitis", "Milia", "Hyperpigmentation",
    "Cystic Acne"
]

SEVERITY_LEVELS = ["mild", "moderate", "severe", "urgent"]

VALID_DISEASES_LOWER = {d.lower(): d for d in DISEASE_LIST}


class DiagnosisAgent(BaseAgent):
    name = "diagnosis"

    def process(self, context: dict) -> dict:
        patient_text = context.get("patient_text", "")
        image_description = context.get("image_description", "")
        followup_answers = context.get("followup_answers", "")

        if not image_description:
            return {"detections": [], "explanation": "No visual data available for diagnosis."}

        client = Groq(api_key=settings.groq_api_key)
        diseases_json = json.dumps(DISEASE_LIST)

        prompt = (
            "You are a board-certified dermatologist AI. Based on the patient's description and visual analysis, "
            "determine which skin conditions are present.\n\n"
            f"Patient description: {patient_text}\n"
            f"Visual analysis: {image_description}\n"
            f"Follow-up answers: {followup_answers}\n\n"
            f"Possible conditions: {diseases_json}\n\n"
            "Respond ONLY with a valid JSON array (no markdown, no code fences). "
            "Each object must have: disease (string), confidence (integer 0-100), severity (one of: mild, moderate, urgent). "
            "List ALL conditions that might apply, sorted by confidence descending. "
            "Include at least one condition. Maximum 4 conditions.\n\n"
            "Then on a new line after the JSON, provide a brief explanation (2-3 sentences) of why you think "
            "the top condition is the most likely, mentioning specific visual findings.\n\n"
            "Format:\n"
            "[{\"disease\": \"...\", \"confidence\": 94, \"severity\": \"urgent\"}, ...]\n"
            "EXPLANATION: Your explanation here."
        )

        response = client.chat.completions.create(
            model=settings.groq_model,
            max_completion_tokens=1000,
            messages=[
                {"role": "system", "content": "You are a precise dermatology diagnosis AI. Always respond with valid JSON + explanation."},
                {"role": "user", "content": prompt},
            ],
        )

        content = response.choices[0].message.content

        detections = []
        explanation = ""

        try:
            json_match = re.search(r'\[.*?\]', content, re.DOTALL)
            if json_match:
                raw = json.loads(json_match.group())
                for item in raw:
                    disease_name = str(item.get("disease", ""))
                    confidence = int(item.get("confidence", 0))
                    severity = str(item.get("severity", "mild")).lower()
                    if severity not in SEVERITY_LEVELS:
                        severity = "mild"
                    if disease_name.lower() in VALID_DISEASES_LOWER:
                        disease_name = VALID_DISEASES_LOWER[disease_name.lower()]
                    detections.append({
                        "disease": disease_name,
                        "confidence": max(0, min(100, confidence)),
                        "severity": severity,
                    })
                detections.sort(key=lambda x: x["confidence"], reverse=True)
                detections = detections[:4]
        except (json.JSONDecodeError, AttributeError, ValueError) as e:
            logger.warning(f"Diagnosis JSON parse failed: {e}")
            detections = [{"disease": "Acne Vulgaris", "confidence": 50, "severity": "mild"}]

        expl_match = re.search(r'EXPLANATION:\s*(.*)', content, re.DOTALL)
        if expl_match:
            explanation = expl_match.group(1).strip()[:1000]
        else:
            explanation = "Based on the visual analysis of your skin, the conditions listed above appear most consistent with your symptoms."

        return {
            "detections": detections,
            "explanation": explanation,
        }

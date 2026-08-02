import json
import re
import asyncio
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
DIAGNOSIS_TIMEOUT = 10


class DiagnosisAgent(BaseAgent):
    name = "diagnosis"

    def _call_groq(self, patient_text: str, image_description: str, followup_answers: str) -> str:
        client = Groq(api_key=settings.groq_api_key)
        diseases_json = json.dumps(DISEASE_LIST)
        prompt = (
            "You are a dermatologist AI. Based on patient description and visual analysis, "
            "determine which skin conditions are present.\n\n"
            f"Patient: {patient_text}\n"
            f"Visual: {image_description}\n"
            f"Follow-up: {followup_answers}\n\n"
            f"Conditions: {diseases_json}\n\n"
            "Respond ONLY with a JSON array. Each object: disease (string), confidence (0-100 int), severity (mild/moderate/urgent). "
            "Max 3 conditions, sorted by confidence.\n\n"
            "Then EXPLANATION: 2 sentences about top condition.\n\n"
            "Format: [{\"disease\": \"...\", \"confidence\": 94, \"severity\": \"urgent\"}]\nEXPLANATION: ..."
        )
        response = client.chat.completions.create(
            model=settings.groq_model,
            max_completion_tokens=500,
            messages=[
                {"role": "system", "content": "Dermatology diagnosis AI. Return JSON + explanation only."},
                {"role": "user", "content": prompt},
            ],
        )
        return response.choices[0].message.content

    def _parse_response(self, content: str) -> dict:
        detections = []
        explanation = ""

        try:
            json_match = re.search(r'\[.*?\]', content, re.DOTALL)
            if json_match:
                raw = json.loads(json_match.group())
                for item in raw[:3]:
                    disease = str(item.get("disease", ""))
                    confidence = int(item.get("confidence", 50))
                    severity = str(item.get("severity", "mild")).lower()
                    if severity not in SEVERITY_LEVELS:
                        severity = "mild"
                    if disease.lower() in VALID_DISEASES_LOWER:
                        disease = VALID_DISEASES_LOWER[disease.lower()]
                    detections.append({
                        "disease": disease,
                        "confidence": max(0, min(100, confidence)),
                        "severity": severity,
                    })
        except (json.JSONDecodeError, ValueError):
            detections = [{"disease": "Skin Condition", "confidence": 50, "severity": "mild"}]

        expl_match = re.search(r'EXPLANATION:\s*(.*)', content, re.DOTALL)
        if expl_match:
            explanation = expl_match.group(1).strip()[:500]

        return {"detections": detections, "explanation": explanation}

    def process(self, context: dict) -> dict:
        patient_text = context.get("patient_text", "")
        image_description = context.get("image_description", "")
        followup_answers = context.get("followup_answers", "")

        if not image_description:
            return {"detections": [], "explanation": "No visual data available."}

        try:
            content = asyncio.wait_for(
                asyncio.to_thread(self._call_groq, patient_text, image_description, followup_answers),
                timeout=DIAGNOSIS_TIMEOUT,
            )
            return self._parse_response(content)
        except asyncio.TimeoutError:
            logger.warning(f"Diagnosis timed out after {DIAGNOSIS_TIMEOUT}s")
            return {
                "detections": [{"disease": "Skin Condition", "confidence": 50, "severity": "mild"}],
                "explanation": "Diagnosis timed out. A general assessment has been provided.",
            }
        except Exception as e:
            logger.error(f"Diagnosis failed: {e}")
            return {
                "detections": [{"disease": "Skin Condition", "confidence": 50, "severity": "mild"}],
                "explanation": "Diagnosis service temporarily unavailable.",
            }

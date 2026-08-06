import json
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

    def _recommendations_from_llm(self, detections: list[dict]) -> list[dict]:
        """Ask the model for real product/medicine recommendations per detected condition."""
        features_text = "; ".join(f"{d['feature']} ({d['severity']})" for d in detections[:5])
        prompt = (
            "You are a dermatologist recommending over-the-counter treatments for these skin conditions.\n"
            f"Conditions: {features_text}\n\n"
            "For EACH condition return ONE JSON object in this exact array format. Use ONLY real, widely available "
            "products (brand-name ingredients/creams/gels/tubes you can buy at a pharmacy). No markdown, no bullets.\n"
            '[{"feature":"acne","recommendation":"Benzoyl Peroxide 5% gel (e.g. PanOxyl) twice daily","routine":"AM: gentle cleanser + spot treatment. PM: same + light moisturizer","frequency":"Apply twice daily for 4-6 weeks","duration":"Reassess after 6 weeks"}]\n'
            "Return ONLY the JSON array, valid and parseable."
        )
        try:
            content = self._call_groq(prompt)
            start = content.find("[")
            end = content.rfind("]") + 1
            if start == -1 or end <= start:
                return []
            raw = json.loads(content[start:end])
            recs = []
            for item in raw:
                if isinstance(item, dict) and item.get("feature"):
                    recs.append({
                        "feature": str(item.get("feature", ""))[:60],
                        "recommendation": str(item.get("recommendation", ""))[:160],
                        "routine": str(item.get("routine", ""))[:200],
                        "frequency": str(item.get("frequency", ""))[:80],
                        "duration": str(item.get("duration", ""))[:80],
                    })
            return recs[:5]
        except Exception as e:
            logger.error(f"Recommendation generation failed: {e}")
            return []

    def _fallback_recommendations(self, detections: list[dict]) -> list[dict]:
        products = {
            "acne": ("Benzoyl Peroxide 5% gel (PanOxyl) or Salicylic Acid 2% wash", "Twice daily"),
            "blackheads": ("Salicylic Acid 2% cleanser + pore strips weekly", "Daily, pore strips weekly"),
            "whiteheads": ("Salicylic Acid 2% serum or Benzoyl Peroxide spot treatment", "Nightly"),
            "pigmentation": ("Vitamin C serum 10-20% + licorice/kojic acid cream", "Daily AM"),
            "melasma": ("Hydroquinone 2% or Azelaic Acid 15-20% cream + high-SPF", "Nightly, SPF daily"),
            "rosacea": ("Metronidazole gel (Metrogel) + Azelaic Acid 15% + gentle cleanser", "Twice daily"),
            "psoriasis": ("Coal Tar 1-5% ointment or Salicylic Acid + moisturizer with urea", "Nightly"),
            "eczema": ("Hydrocortisone 1% cream + ceramide-rich moisturizer (CeraVe)", "Twice daily"),
            "dry_skin": ("Ceramide moisturizer (CeraVe/Cetaphil) + Hyaluronic acid serum", "Twice daily"),
            "oily_skin": ("Salicylic Acid 2% cleanser + Niacinamide 10% serum", "Twice daily"),
            "wrinkles": ("Retinol 0.25-0.5% (Olay/ROC) at night + Vitamin C AM + SPF", "Retinol nightly"),
            "fine_lines": ("Peptide cream or Retinol 0.25% + hydrating serum", "Nightly"),
            "sun_damage": ("Vitamin C serum AM + Retinol PM + SPF 50+ daily", "Daily"),
            "dark_circles": ("Caffeine + Vitamin K eye cream + adequate sleep + sunblock", "Twice daily"),
            "enlarged_pores": ("Niacinamide 10% serum + Salicylic Acid 2% wash", "Twice daily"),
            "redness": ("Azelaic Acid 10-15% + centella/soothing cream + SPF", "Twice daily"),
            "skin_tone": ("Vitamin C 10% + AHA glycolic toner 2-3x/week + SPF 30+", "Daily"),
        }
        recs = []
        for d in detections[:5]:
            key = d["feature"].lower().replace(" ", "_")
            product, freq = products.get(key, products.get(d["feature"].lower(), ("Gentle cleanser + moisturizer + SPF 30+", "Daily")))
            recs.append({
                "feature": d["feature"],
                "recommendation": product,
                "routine": f"AM: cleanse, apply, moisturize, SPF. PM: cleanse, apply treatment, moisturize.",
                "frequency": freq,
                "duration": "Reassess after 4-6 weeks. See a dermatologist if it worsens.",
            })
        return recs

    def process(self, context: dict) -> dict:
        patient_text = context.get("patient_text", "")
        detections = context.get("detections", [])
        explanation = context.get("explanation", "")
        skin_profile = context.get("skin_profile", {}) or {}

        fallback_text = "General skin care: Keep skin clean, moisturized, and protected with SPF 30+ daily. Consult a dermatologist for persistent concerns."

        if not detections:
            return {"treatment": fallback_text, "recommendations": []}

        top = detections[0]
        disease = top.get("feature", "skin condition")
        severity = top.get("severity", "mild")

        skin_context = ""
        if skin_profile:
            parts = []
            if skin_profile.get("skin_type"):
                parts.append(f"skin type: {skin_profile['skin_type']}")
            if skin_profile.get("fitzpatrick"):
                parts.append(f"Fitzpatrick skin type: {skin_profile['fitzpatrick']}")
            if skin_profile.get("undertone"):
                parts.append(f"undertone: {skin_profile['undertone']}")
            if skin_profile.get("tone_label"):
                parts.append(f"tone: {skin_profile['tone_label']}")
            if parts:
                skin_context = "Skin profile (" + ", ".join(parts) + ").\n"

        prompt = (
            f"Patient has {disease} ({severity}).\n"
            f"{skin_context}"
            f"Description: {patient_text[:500]}\n"
            f"Analysis: {explanation[:300]}\n\n"
            "Provide 3-5 sentences: immediate care, lifestyle tips, when to see dermatologist. "
            "Tailor advice to the patient's skin profile when given. No markdown."
        )

        try:
            result = self._call_groq(prompt)
        except Exception as e:
            logger.error(f"Treatment failed: {e}")
            result = fallback_text

        recommendations = self._recommendations_from_llm(detections)
        if not recommendations:
            recommendations = self._fallback_recommendations(detections)

        return {"treatment": result, "recommendations": recommendations}

"""Scanner agent for AI Skin Scanner - camera guidance and 17-feature skin analysis"""

import base64
import logging
import re
import json
from io import BytesIO
from PIL import Image
from groq import Groq
from config import settings
from .base_agent import BaseAgent

logger = logging.getLogger(__name__)

SCANNER_FEATURES = [
    {"id": "acne", "label": "Acne", "description": "Inflammation, pimples, blackheads, cysts"},
    {"id": "blackheads", "label": "Blackheads", "description": "Open pores, black dots"},
    {"id": "whiteheads", "label": "Whiteheads", "description": "Closed comedones, white bumps"},
    {"id": "pigmentation", "label": "Pigmentation", "description": "Dark spots, uneven skin tone"},
    {"id": "melasma", "label": "Melasma", "description": "Brown patches, hormonal discoloration"},
    {"id": "rosacea", "label": "Rosacea", "description": "Redness, visible blood vessels, bumps on face"},
    {"id": "psoriasis", "label": "Psoriasis", "description": "Thick, silvery scales, red patches"},
    {"id": "eczema", "label": "Eczema", "description": "Dry, itchy, inflamed patches"},
    {"id": "dry_skin", "label": "Dry Skin", "description": "Flaky, tight, dehydrated appearance"},
    {"id": "oily_skin", "label": "Oily Skin", "description": "Shiny, greasy, enlarged pores"},
    {"id": "wrinkles", "label": "Wrinkles", "description": "Deep lines, expression lines"},
    {"id": "fine_lines", "label": "Fine Lines", "description": "Fine creases, mild texture changes"},
    {"id": "sun_damage", "label": "Sun Damage", "description": "Uneven tone, spots from UV exposure"},
    {"id": "dark_circles", "label": "Dark Circles", "description": "Dark pigmentation under eyes"},
    {"id": "enlarged_pores", "label": "Enlarged Pores", "description": "Visible open pores, especially on nose/cheeks"},
    {"id": "redness", "label": "Redness", "description": "General redness, irritation, inflammation"},
    {"id": "skin_tone", "label": "Skin Tone", "description": "Overall skin tone, glow, evenness"},
]

SEVERITY_LEVELS = ["mild", "moderate", "severe"]

CAMERA_FEEDBACK_PROMPT = """Analyze this photo for skin scanning setup quality. Provide JSON:
{
  "lighting": "poor" | "good" | "too_bright",
  "blur": "blurry" | "clear",
  "face_distance": "too_close" | "good" | "too_far",
  "makeup": true | false,
  "glasses": true | false,
  "face_visible": true | false,
  "face_size_ratio": 0.0-1.0,
  "feedback_urdu": "Urdu suggestion for user",
  "feedback_english": "English suggestion for user"
}"""

SKIN_FEATURE_DETECTION_PROMPT = """Analyze this skin photo carefully. Detect visible skin features from this list.
Return ONLY JSON array. Each object: {feature: string, confidence: 0-100, severity: "mild"|"moderate"|"severe", description: string}.
Max 5 features, sorted by confidence. If a feature is not visible, do not include it.
Features to check: {features}.
Focus only on visually detectable features."""

SKIN_SCORE_PROMPT = """Based on the detected skin features and their confidence/severity, give an overall skin health score from 1-10.
Respond with ONLY a number (1-10). Higher = healthier skin."""


class ScannerAgent(BaseAgent):
    name = "scanner"

    def _encode_image(self, filepath: str) -> str:
        image = Image.open(filepath)
        image.thumbnail((512, 512))
        buffer = BytesIO()
        image.convert("RGB").save(buffer, format="JPEG", quality=60)
        return base64.b64encode(buffer.getvalue()).decode("utf-8")

    def _call_vision_model(self, image_data: str, prompt: str, max_tokens: int = 300) -> str:
        client = Groq(api_key=settings.groq_api_key)
        response = client.chat.completions.create(
            model=settings.groq_vision_model,
            max_completion_tokens=max_tokens,
            temperature=0.3,
            messages=[
                {"role": "system", "content": "You are an expert dermatology AI assistant. Provide concise, accurate analysis."},
                {"role": "user", "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_data}"}},
                ]},
            ],
        )
        return response.choices[0].message.content

    def _call_text_model(self, prompt: str, max_tokens: int = 500) -> str:
        client = Groq(api_key=settings.groq_api_key)
        response = client.chat.completions.create(
            model=settings.groq_model,
            max_completion_tokens=max_tokens,
            temperature=0.4,
            reasoning_effort="none",
            messages=[
                {"role": "system", "content": "You are a dermatology AI assistant. Provide helpful, safe responses."},
                {"role": "user", "content": prompt},
            ],
        )
        return response.choices[0].message.content

    def analyze_camera_frame(self, image_path: str) -> dict:
        """Analyze a captured frame for camera setup quality (lighting, blur, distance, makeup, glasses)."""
        try:
            image_data = self._encode_image(image_path)
            result = self._call_vision_model(image_data, CAMERA_FEEDBACK_PROMPT)
            parsed = self._safe_parse_json(result)
            if parsed:
                return parsed
        except Exception as e:
            logger.error(f"Camera frame analysis failed: {e}")

        return {
            "lighting": "good",
            "blur": "clear",
            "face_distance": "good",
            "makeup": False,
            "glasses": False,
            "face_visible": True,
            "face_size_ratio": 0.5,
            "feedback_urdu": "Setting theo yeh ke liye koi masla nahi",
            "feedback_english": "No issues detected with the setup",
        }

    def detect_skin_features(self, image_path: str, selected_features: list[str] | None = None) -> dict:
        """Detect specific skin features from a photo.

        Args:
            image_path: Path to the image file
            selected_features: List of feature IDs to detect (defaults to all 17)
        """
        if selected_features:
            features_to_check = [f["label"] for f in SCANNER_FEATURES if f["id"] in selected_features]
        else:
            features_to_check = [f["label"] for f in SCANNER_FEATURES]

        try:
            image_data = self._encode_image(image_path)
            prompt = SKIN_FEATURE_DETECTION_PROMPT.format(features=", ".join(features_to_check))
            result = self._call_vision_model(image_data, prompt, max_tokens=500)
            detections = self._parse_detections(result)
        except Exception as e:
            logger.error(f"Skin feature detection failed: {e}")
            detections = []

        return {"detections": detections}

    def calculate_skin_score(self, image_path: str, detections: list[dict]) -> float:
        """Calculate an overall skin health score from 1-10."""
        try:
            image_data = self._encode_image(image_path)
            detections_text = json.dumps(detections[:5]) if detections else "No significant concerns detected."
            prompt = SKIN_SCORE_PROMPT + f"\n\nDetections: {detections_text}"
            result = self._call_vision_model(image_data, prompt, max_tokens=10)
            score = self._parse_score(result)
            return score
        except Exception as e:
            logger.error(f"Skin score calculation failed: {e}")
            return 5.0

    def _safe_parse_json(self, content: str) -> dict | None:
        try:
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            start = content.index("{")
            end = content.rindex("}") + 1
            return json.loads(content[start:end])
        except (ValueError, json.JSONDecodeError):
            return None

    def _parse_detections(self, content: str) -> list[dict]:
        """Parse the JSON array of detections from the model response."""
        try:
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            start = content.index("[")
            end = content.rindex("]") + 1
            raw = json.loads(content[start:end])
            detections = []
            for item in raw[:5]:
                confidence = int(item.get("confidence", 50))
                severity = str(item.get("severity", "mild")).lower()
                if severity not in SEVERITY_LEVELS:
                    severity = "mild"
                detections.append({
                    "feature": str(item.get("feature", "Unknown")),
                    "confidence": max(0, min(100, confidence)),
                    "severity": severity,
                    "description": str(item.get("description", ""))[:300],
                })
            return detections
        except (ValueError, json.JSONDecodeError, IndexError):
            return []

    def _parse_score(self, content: str) -> float:
        """Parse a 1-10 score from model response."""
        numbers = re.findall(r'\d+\.?\d*', content)
        if numbers:
            score = float(numbers[0])
            return max(1.0, min(10.0, score))
        return 5.0

    def process(self, context: dict) -> dict:
        image_path = context.get("image_path")
        selected_features = context.get("selected_features")

        if not image_path:
            return {"detections": [], "error": "No image provided"}

        result = self.detect_skin_features(image_path, selected_features)
        score = self.calculate_skin_score(image_path, result.get("detections", []))
        result["skin_score"] = score
        return result
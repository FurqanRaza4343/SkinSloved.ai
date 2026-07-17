from dataclasses import dataclass, field
from typing import Any
from .vision_agent import VisionAgent
from .diagnosis_agent import DiagnosisAgent
from .treatment_agent import TreatmentAgent
from services.product_service import generate_product_recommendations


@dataclass
class DiseaseDetection:
    disease: str
    confidence: int
    severity: str


@dataclass
class ConsultationResult:
    detections: list[DiseaseDetection] = field(default_factory=list)
    explanation: str = ""
    treatment: str = ""
    products: list[dict] = field(default_factory=list)


class AgentOrchestrator:
    def __init__(self):
        self.vision = VisionAgent()
        self.diagnosis = DiagnosisAgent()
        self.treatment = TreatmentAgent()

    def run(self, patient_text: str, image_path: str | None = None, video_path: str | None = None, followup_answers: str = "") -> ConsultationResult:
        context: dict[str, Any] = {
            "patient_text": patient_text,
            "image_path": image_path,
            "video_path": video_path,
            "followup_answers": followup_answers,
        }

        # Step 1: Vision analysis
        vision_result = self.vision.process(context)
        context["image_description"] = vision_result.get("image_description", "")

        # Step 2: Diagnosis
        diagnosis_result = self.diagnosis.process(context)
        detections_data = diagnosis_result.get("detections", [])
        context["detections"] = detections_data
        context["explanation"] = diagnosis_result.get("explanation", "")

        # Step 3: Treatment
        treatment_result = self.treatment.process(context)
        context["treatment"] = treatment_result.get("treatment", "")

        # Step 4: Product recommendations with images
        top_detection = detections_data[0] if detections_data else {}
        products = generate_product_recommendations(
            patient_text=patient_text,
            skin_type=top_detection.get("disease", "unknown"),
            severity=top_detection.get("severity", "mild"),
        )

        detections = []
        for d in detections_data:
            detection = DiseaseDetection(
                disease=d.get("disease", "Unknown"),
                confidence=d.get("confidence", 0),
                severity=d.get("severity", "mild"),
            )
            if isinstance(detection.confidence, str):
                try:
                    detection.confidence = int(detection.confidence)
                except ValueError:
                    detection.confidence = 0
            detections.append(detection)

        return ConsultationResult(
            detections=detections,
            explanation=diagnosis_result.get("explanation", ""),
            treatment=treatment_result.get("treatment", ""),
            products=products,
        )

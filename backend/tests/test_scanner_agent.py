"""Tests for the ScannerAgent parsing logic (feature canonicalization, detection result JSON parsing, score parsing)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from agents.scanner_agent import ScannerAgent, SCANNER_FEATURES, SEVERITY_LEVELS

agent = ScannerAgent()


def test_canonical_feature_exact():
    fid, label = agent._canonical_feature("acne")
    assert fid == "acne"
    assert label == "Acne"


def test_canonical_feature_with_underscores():
    fid, label = agent._canonical_feature("dry_skin")
    assert fid == "dry_skin"
    assert label == "Dry Skin"


def test_canonical_feature_fuzzy_containment():
    fid, label = agent._canonical_feature("enlarged pores on cheeks")
    assert fid == "enlarged_pores"


def test_canonical_feature_unknown_returns_none():
    assert agent._canonical_feature("alien_rust") is None


def test_canonical_feature_empty_returns_none():
    assert agent._canonical_feature("") is None


def test_parse_detection_result_basic():
    content = """```json
    {
      "skin_profile": {"skin_type": "combination", "fitzpatrick": "IV", "undertone": "warm", "tone_label": "tan"},
      "features": [
        {"feature": "acne", "confidence": 84, "severity": "moderate", "description": "Scattered red bumps"},
        {"feature": "Oily Skin", "confidence": 66, "severity": "mild", "description": "Shine on forehead"},
        {"feature": "skin tone", "confidence": 95, "severity": "mild", "description": "overall tone"}
      ]
    }
    ```"""
    detections, profile = agent._parse_detection_result(content)
    assert profile["skin_type"] == "combination"
    # skin_tone must be excluded from treatable detections
    assert len(detections) == 2
    features = {d["feature"] for d in detections}
    assert features == {"Acne", "Oily Skin"}
    acne = [d for d in detections if d["feature"] == "Acne"][0]
    assert acne["confidence"] == 84
    assert acne["severity"] == "moderate"


def test_parse_detection_result_bare_array_fallback():
    content = '[{"feature": "rosacea", "confidence": "91", "severity": "SEVERE", "description": "Redness"}]'
    detections, settings = agent._parse_detection_result(content)
    assert settings == {}
    assert len(detections) == 1
    assert detections[0]["feature"] == "Rosacea"
    assert detections[0]["severity"] == "severe"


def test_parse_detection_result_invalid_severity_clamped():
    content = '[{"feature": "eczema", "confidence": 50, "severity": "catastrophic", "description": ""}]'
    detections, _ = agent._parse_detection_result(content)
    assert detections and detections[0]["severity"] in SEVERITY_LEVELS


def test_parse_detection_result_confidence_clamped():
    content = '[{"feature": "wrinkles", "confidence": 150, "severity": "mild", "description": ""}]'
    detections, _ = agent._parse_detection_result(content)
    assert detections[0]["confidence"] == 100


def test_parse_detection_result_garbage():
    detections, settings = agent._parse_detection_result("no json here at all")
    assert detections == []
    assert settings == {}


def test_parse_score_number():
    assert agent._parse_score("7.5") == 7.5


def test_parse_score_wordy():
    assert agent._parse_score("The skin health score is 6 out of 10") == 6.0


def test_parse_score_out_of_range_clamped():
    assert agent._parse_score("15") == 10.0


def test_parse_score_empty_defaults():
    assert agent._parse_score("no numbers") == 5.0


def test_scanner_features_have_unique_ids():
    ids = [f["id"] for f in SCANNER_FEATURES]
    assert len(ids) == len(set(ids))
    assert "skin_tone" in ids
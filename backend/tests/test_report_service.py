"""Tests for PDF report generation (sanitization + scanner PDF + consultation PDF)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from services.report_service import _latin, generate_consultation_pdf, generate_scanner_pdf


def test_latin_ascii_passthrough():
    assert _latin("Hello, World!") == "Hello, World!"


def test_latin_strips_accents():
    assert _latin("caf\u00e9") == "cafe"


def test_latin_replaces_emoji():
    assert "?" in _latin("skincare \U0001f60d")


def test_latin_empty():
    assert _latin(None) == ""
    assert _latin("") == ""


def test_consultation_pdf_returns_bytes():
    pdf = generate_consultation_pdf(
        consultation_id="ab" * 16,
        patient_text="Acne on forehead and cheeks",
        doctor_response="Use a gentle cleanser twice daily.",
        severity="moderate",
        created_at="2026-01-01T00:00:00Z",
        image_url=None,
    )
    assert isinstance(pdf, bytes)
    assert b"%PDF" in pdf[:5]
    assert len(pdf) > 500


def test_scanner_pdf_returns_bytes():
    pdf = generate_scanner_pdf(
        scan_id="cd" * 16,
        detections=[{"feature": "Acne", "confidence": 84, "severity": "moderate", "description": "Inflammation"}],
        explanation="Main concern detected.",
        treatment="Consistent routine with salicylic acid.",
        recommendations=[{"feature": "Acne", "recommendation": "Benzoyl peroxide 5%", "frequency": "Once daily", "routine": "PM"}],
        skin_score=6.2,
        skin_profile={"skin_type": "oily", "fitzpatrick": "IV", "undertone": "warm", "tone_label": "tan"},
        products=[{"brand": "CeraVe", "name": "Foaming Cleanser", "price_range": "$15", "key_ingredients": ["niacinamide"], "amazon_search_url": "https://amazon.com/s?k=CeraVe+Foaming"}],
    )
    assert isinstance(pdf, bytes)
    assert pdf[:4] == b"%PDF"


def test_scanner_pdf_sanitizes_unicode():
    pdf = generate_scanner_pdf(
        scan_id="ef" * 16,
        detections=[],
        explanation="Caf\u00e9 de la peau \U0001f60d",
        treatment="",
        skin_profile={},
        products=[],
    )
    assert b"%PDF" in pdf[:4]
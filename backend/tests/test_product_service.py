"""Tests for product service helpers (name matching, placeholder SVG, caching)."""

import sys
import base64
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import services.product_service as ps


def _svg_text(data_uri: str) -> str:
    return base64.b64decode(data_uri.split(",", 1)[1]).decode("utf-8")


def test_name_match_positive():
    assert ps._name_match("Cosrx Snail Mucin", "COSRX Snail Mucin 96% Power Essence") is True


def test_name_match_negative():
    assert ps._name_match("Cetaphil Gentle Cleanser", "La Roche-Posay Effaclar Gel") is False


def test_name_match_empty_result():
    assert ps._name_match("Anything", None) is False


def test_placeholder_svg_contains_brand_and_name():
    svg = ps._category_placeholder_svg("cleanser", "CeraVe", "Foaming Cleanser")
    text = _svg_text(svg)
    assert "<svg" in text
    assert "CeraVe" in text
    assert "Foaming Cleanser" in text


def test_placeholder_svg_default_category():
    svg = ps._category_placeholder_svg("unknown-category", "AcneX", "Cleanser")
    assert "<svg" in _svg_text(svg)


def test_cache_key_normalization():
    k1 = ps._cache_key("   Acne  Breakout  ", "oily", "MODERATE")
    k2 = ps._cache_key("acne breakout", "Oily", "moderate")
    assert k1 == k2


def test_cache_ttl_expiry():
    key = ps._cache_key("cache-ttl-test", "dry", "mild")
    past = time.monotonic() - (ps.PRODUCT_CACHE_TTL + 10)
    ps._product_cache[key] = (past, [{"name": "old"}])
    assert ps._cache_get(key) is None


def test_cache_hit_returns_value():
    key = ps._cache_key("cache-hit-test", "dry", "mild")
    ps._product_cache[key] = (time.monotonic(), [{"name": "good"}])
    val = ps._cache_get(key)
    assert val == [{"name": "good"}]
    ps._product_cache.pop(key, None)


def test_generate_recommendations_bounds_cache():
    ps._product_cache.clear()
    assert ps._cache_get("x") is None
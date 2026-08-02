"""Product recommendation service using Groq AI + multi-source images"""

import json
import httpx
from groq import Groq
from typing import Any
from config import settings

logger = __import__("logging").getLogger(__name__)

OPEN_BEAUTY_FACTS = "https://world.openbeautyfacts.org/api/v2"
GOOGLE_CSE_URL = "https://www.googleapis.com/customsearch/v1"

PRODUCT_HTTP_TIMEOUT = 5

CATEGORY_COLORS = {
    "cleanser": "from-sky-400 to-blue-500",
    "moisturizer": "from-teal-400 to-emerald-500",
    "serum": "from-violet-400 to-purple-500",
    "sunscreen": "from-amber-400 to-orange-500",
    "treatment": "from-rose-400 to-pink-500",
    "toner": "from-cyan-400 to-teal-500",
    "mask": "from-indigo-400 to-violet-500",
    "eye-cream": "from-fuchsia-400 to-pink-500",
}
CATEGORY_ICONS = {
    "cleanser": "CL", "moisturizer": "MO", "serum": "SE",
    "sunscreen": "SP", "treatment": "TX", "toner": "TO",
    "mask": "MK", "eye-cream": "EY",
}


def _name_match(search_name: str, result_name: str | None) -> bool:
    if not result_name:
        return False
    search_words = set(search_name.lower().split()[:3])
    result_words = set(result_name.lower().split())
    return len(search_words & result_words) >= 2


def _category_placeholder_svg(category: str, brand: str, name: str) -> str:
    icon = CATEGORY_ICONS.get(category, "PR")
    gradient = CATEGORY_COLORS.get(category, "from-sky-400 to-blue-500")
    c1, c2 = "#0ea5e9", "#06b6d4"
    if "sky" in gradient and "blue" in gradient:
        c1, c2 = "#0ea5e9", "#3b82f6"
    elif "teal" in gradient and "emerald" in gradient:
        c1, c2 = "#14b8a6", "#10b981"
    elif "violet" in gradient and "purple" in gradient:
        c1, c2 = "#8b5cf6", "#a855f7"
    elif "amber" in gradient and "orange" in gradient:
        c1, c2 = "#f59e0b", "#f97316"
    elif "rose" in gradient and "pink" in gradient:
        c1, c2 = "#f43f5e", "#ec4899"
    elif "cyan" in gradient and "teal" in gradient:
        c1, c2 = "#06b6d4", "#14b8a6"
    elif "indigo" in gradient and "violet" in gradient:
        c1, c2 = "#6366f1", "#8b5cf6"
    elif "fuchsia" in gradient and "pink" in gradient:
        c1, c2 = "#d946ef", "#ec4899"
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" style="stop-color:{c1};stop-opacity:1" />
    <stop offset="100%" style="stop-color:{c2};stop-opacity:1" />
  </linearGradient></defs>
  <rect width="400" height="400" rx="20" fill="url(#bg)"/>
  <text x="200" y="180" font-size="72" font-family="sans-serif" text-anchor="middle" fill="white" opacity="0.9" font-weight="bold">{icon}</text>
  <text x="200" y="260" font-size="22" font-family="sans-serif" text-anchor="middle" fill="white" font-weight="bold">{brand[:30]}</text>
  <text x="200" y="295" font-size="16" font-family="sans-serif" text-anchor="middle" fill="white" opacity="0.8">{name[:40]}</text>
</svg>'''
    import base64
    encoded = base64.b64encode(svg.encode()).decode()
    return f"data:image/svg+xml;base64,{encoded}"


def _fetch_obf_image(product_name: str, brand: str) -> str | None:
    for query in [f"{brand} {product_name}", product_name]:
        for attempt in range(2):
            try:
                q = query.replace(",", "").replace("  ", " ").strip()
                if not q:
                    continue
                r = httpx.get(
                    f"{OPEN_BEAUTY_FACTS}/search",
                    params={"search_terms": q, "fields": "image_url,product_name,brands,code", "size": 5, "json": 1},
                    timeout=PRODUCT_HTTP_TIMEOUT,
                )
                if r.status_code == 429:
                    logger.warning(f"OBF rate limited (attempt {attempt + 1})")
                    if attempt == 0:
                        import time; time.sleep(1)
                        continue
                    return None
                if r.status_code >= 500:
                    logger.warning(f"OBF server error {r.status_code} (attempt {attempt + 1})")
                    if attempt == 0:
                        import time; time.sleep(1)
                        continue
                    return None
                data = r.json()
                for p in data.get("products", []):
                    if p.get("image_url") and _name_match(f"{brand} {product_name}", p.get("product_name")):
                        return p["image_url"]
                break
            except httpx.TimeoutException:
                logger.warning(f"OBF timeout for '{query}' (attempt {attempt + 1})")
                if attempt == 0:
                    import time; time.sleep(1)
                    continue
            except Exception as e:
                logger.warning(f"OBF request failed: {e}")
                break
    return None


def _fetch_google_image(product_name: str, brand: str) -> str | None:
    google_key = settings.google_cse_api_key
    google_cx = settings.google_cse_cx
    if not google_key or not google_cx:
        return None
    for attempt in range(2):
        try:
            r = httpx.get(
                GOOGLE_CSE_URL,
                params={"key": google_key, "cx": google_cx, "q": f"{brand} {product_name}", "searchType": "image", "num": 1},
                timeout=PRODUCT_HTTP_TIMEOUT,
            )
            if r.status_code == 429:
                logger.warning(f"Google CSE rate limited (attempt {attempt + 1})")
                if attempt == 0:
                    import time; time.sleep(1)
                    continue
                return None
            if r.status_code >= 500:
                logger.warning(f"Google CSE error {r.status_code} (attempt {attempt + 1})")
                if attempt == 0:
                    import time; time.sleep(1)
                    continue
                return None
            items = r.json().get("items", [])
            if items:
                return items[0].get("link")
            break
        except httpx.TimeoutException:
            logger.warning(f"Google CSE timeout (attempt {attempt + 1})")
            if attempt == 0:
                import time; time.sleep(1)
                continue
        except Exception as e:
            logger.warning(f"Google CSE request failed: {e}")
            break
    return None


def _call_groq_products(patient_text: str, skin_type: str, severity: str) -> str:
    client = Groq(api_key=settings.groq_api_key)
    prompt = (
        "Recommend 3-4 REAL skincare products for this skin concern.\n"
        f"Concern: {patient_text[:300]}\n"
        f"Condition: {skin_type or 'unknown'}\n"
        f"Severity: {severity or 'unknown'}\n\n"
        "Return ONLY JSON array: [{\"brand\":\"...\",\"name\":\"...\",\"category\":\"...\",\"key_ingredients\":[\"...\"],\"description\":\"...\",\"price_range\":\"$\"}]"
        "\nCategories: cleanser, moisturizer, serum, sunscreen, treatment, toner"
    )
    response = client.chat.completions.create(
        model=settings.groq_model,
        max_completion_tokens=800,
        temperature=0.1,
        reasoning_effort="none",
        messages=[
            {"role": "system", "content": "Skincare product expert. Return valid JSON only."},
            {"role": "user", "content": prompt},
        ],
    )
    return response.choices[0].message.content.strip()


def generate_product_recommendations(
    patient_text: str,
    skin_type: str | None = None,
    severity: str | None = None,
) -> list[dict[str, Any]]:
    if not settings.groq_api_key:
        return []

    try:
        content = _call_groq_products(patient_text, skin_type or "", severity or "")
    except Exception as e:
        logger.warning(f"Product Groq call failed: {e}")
        return []

    try:
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
        products = json.loads(content)
    except (json.JSONDecodeError, IndexError):
        try:
            start = content.index("[")
            end = content.rindex("]") + 1
            products = json.loads(content[start:end])
        except (ValueError, json.JSONDecodeError):
            return []

    for product in products[:4]:
        product.setdefault("key_ingredients", [])
        brand = product.get("brand", "")
        name = product.get("name", "")
        category = product.get("category", "treatment")
        try:
            img = _fetch_obf_image(name, brand) or _fetch_google_image(name, brand)
        except Exception:
            img = None
        product["image_url"] = img or _category_placeholder_svg(category, brand, name)
        product["amazon_search_url"] = f"https://www.amazon.com/s?k={brand}+{name}".replace(" ", "+")

    return products

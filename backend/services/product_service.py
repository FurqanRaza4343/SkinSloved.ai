"""Product recommendation service using Groq AI + multi-source images"""

import json
import httpx
from groq import Groq
from typing import Any
from config import settings

OPEN_BEAUTY_FACTS = "https://world.openbeautyfacts.org/api/v2"
GOOGLE_CSE_URL = "https://www.googleapis.com/customsearch/v1"

# Category-based emoji/color mapping for fallback placeholders
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
    "cleanser": "CL",
    "moisturizer": "MO",
    "serum": "SE",
    "sunscreen": "SP",
    "treatment": "TX",
    "toner": "TO",
    "mask": "MK",
    "eye-cream": "EY",
}


def _name_match(search_name: str, result_name: str | None) -> bool:
    """Check if a search result's product name plausibly matches."""
    if not result_name:
        return False
    search_words = set(search_name.lower().split()[:3])
    result_words = set(result_name.lower().split())
    return len(search_words & result_words) >= 2


def _category_placeholder_svg(category: str, brand: str, name: str) -> str:
    """Generate an inline SVG placeholder based on product category."""
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
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:{c1};stop-opacity:1" />
      <stop offset="100%" style="stop-color:{c2};stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="400" height="400" rx="20" fill="url(#bg)"/>
  <text x="200" y="180" font-size="72" font-family="sans-serif" text-anchor="middle" fill="white" opacity="0.9" font-weight="bold">{icon}</text>
  <text x="200" y="260" font-size="22" font-family="sans-serif" text-anchor="middle" fill="white" font-weight="bold">{brand[:30]}</text>
  <text x="200" y="295" font-size="16" font-family="sans-serif" text-anchor="middle" fill="white" opacity="0.8">{name[:40]}</text>
</svg>'''
    import base64
    encoded = base64.b64encode(svg.encode()).decode()
    return f"data:image/svg+xml;base64,{encoded}"


def _fetch_obf_image(product_name: str, brand: str) -> str | None:
    """Try Open Beauty Facts for a product image."""
    for query in [f"{brand} {product_name}", product_name]:
        try:
            q = query.replace(",", "").replace("  ", " ").strip()
            if not q:
                continue
            r = httpx.get(
                f"{OPEN_BEAUTY_FACTS}/search",
                params={"search_terms": q, "fields": "image_url,product_name,brands,code", "size": 8, "json": 1},
                timeout=10,
            )
            data = r.json()
            for p in data.get("products", []):
                if p.get("image_url") and _name_match(f"{brand} {product_name}", p.get("product_name")):
                    return p["image_url"]
        except Exception:
            pass
    return None


def _fetch_google_image(product_name: str, brand: str) -> str | None:
    """Try Google Custom Search for a product image."""
    google_key = settings.google_cse_api_key
    google_cx = settings.google_cse_cx
    if not google_key or not google_cx:
        return None
    try:
        q = f"{brand} {product_name}"
        r = httpx.get(
            GOOGLE_CSE_URL,
            params={"key": google_key, "cx": google_cx, "q": q, "searchType": "image", "num": 1},
            timeout=10,
        )
        data = r.json()
        items = data.get("items", [])
        if items:
            return items[0].get("link")
    except Exception:
        pass
    return None


def fetch_product_image(product_name: str, brand: str) -> str | None:
    """Try multiple sources to fetch a real product image, falling back to placeholder."""
    img = _fetch_obf_image(product_name, brand)
    if img:
        return img
    img = _fetch_google_image(product_name, brand)
    if img:
        return img
    return None


def generate_product_recommendations(
    patient_text: str,
    skin_type: str | None = None,
    severity: str | None = None,
) -> list[dict[str, Any]]:
    """Use Groq AI to recommend 3-5 real skincare products based on the patient's concern."""
    groq_api_key = settings.groq_api_key
    if not groq_api_key:
        return []

    client = Groq(api_key=groq_api_key)

    prompt = (
        "You are a skincare product expert. Based on the patient's skin concern below, "
        "recommend 3 to 5 REAL, popular skincare products (brand + product name) that are "
        "widely available (Amazon, drugstores, Sephora, etc.).\n\n"
        f"Patient concern: {patient_text}\n"
        f"Detected skin type: {skin_type or 'unknown'}\n"
        f"Severity: {severity or 'unknown'}\n\n"
        "Return ONLY a valid JSON array of objects with these exact fields:\n"
        "- brand (string): the brand name, e.g. 'CeraVe'\n"
        "- name (string): the full product name, e.g. 'Foaming Facial Cleanser'\n"
        "- category (string): one of 'cleanser', 'moisturizer', 'serum', 'sunscreen', 'treatment', 'toner', 'mask', 'eye-cream'\n"
        "- key_ingredients (array of strings): 2-4 main active ingredients\n"
        "- description (string): one sentence explaining why it helps this specific concern\n"
        "- price_range (string): one of '$' (under $15), '$$' ($15-$35), '$$$' ($35-$60), '$$$$' (over $60)\n\n"
        "Example:\n"
        '[\n'
        '  {\n'
        '    "brand": "CeraVe",\n'
        '    "name": "Foaming Facial Cleanser",\n'
        '    "category": "cleanser",\n'
        '    "key_ingredients": ["Niacinamide", "Ceramides", "Hyaluronic Acid"],\n'
        '    "description": "Gentle foaming cleanser that removes excess oil without stripping the skin barrier.",\n'
        '    "price_range": "$$"\n'
        '  }\n'
        ']\n\n'
        "Important: Only recommend real, well-known products that actually exist. Do NOT make up fake products."
    )

    response = client.chat.completions.create(
        model=settings.groq_model,
        max_completion_tokens=2000,
        temperature=0.1,
        messages=[
            {
                "role": "system",
                "content": "You are a skincare product expert. Always return valid JSON arrays. Never make up fake products.",
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
    )

    content = response.choices[0].message.content.strip()

    # Extract JSON from response
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

    # Enrich with images from multiple sources + placeholder fallback
    for product in products:
        product.setdefault("key_ingredients", [])
        brand = product.get("brand", "")
        name = product.get("name", "")
        category = product.get("category", "treatment")
        img = fetch_product_image(name, brand)
        product["image_url"] = img or _category_placeholder_svg(category, brand, name)
        product["amazon_search_url"] = (
            f"https://www.amazon.com/s?k={brand}+{name}".replace(" ", "+")
        )

    return products

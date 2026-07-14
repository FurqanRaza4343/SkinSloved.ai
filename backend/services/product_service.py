"""Product recommendation service using Groq AI + Open Beauty Facts"""

import json
import httpx
from groq import Groq
from typing import Any
from config import settings

OPEN_BEAUTY_FACTS = "https://world.openbeautyfacts.org/api/v2"


def fetch_product_image(product_name: str, brand: str) -> str | None:
    """Try to fetch a real product image from Open Beauty Facts."""
    try:
        query = f"{brand} {product_name}".replace(",", "").replace("  ", " ")
        r = httpx.get(
            f"{OPEN_BEAUTY_FACTS}/search",
            params={
                "search_terms": query,
                "fields": "image_url,product_name",
                "size": 1,
                "json": 1,
            },
            timeout=10,
        )
        data = r.json()
        products = data.get("products", [])
        if products:
            return products[0].get("image_url")
    except Exception:
        pass
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

    # Enrich with images from Open Beauty Facts
    for product in products:
        product.setdefault("key_ingredients", [])
        img = fetch_product_image(product.get("name", ""), product.get("brand", ""))
        product["image_url"] = img
        product["amazon_search_url"] = (
            f"https://www.amazon.com/s?k={product['brand']}+{product['name']}".replace(" ", "+")
        )

    return products

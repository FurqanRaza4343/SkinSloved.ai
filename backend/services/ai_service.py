"""AI Vision + Text service using Groq vision model"""

import base64
import os
from io import BytesIO
from groq import Groq
from PIL import Image
from typing import Any
from config import settings


def encode_image(filepath: str) -> str:
    image = Image.open(filepath)
    image.thumbnail((1024, 1024))
    buffer = BytesIO()
    image.convert("RGB").save(buffer, format="JPEG", quality=75)
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


def generate_guidance(patient_text: str, image_filepath: str | None = None, video_filepath: str | None = None) -> str:
    groq_api_key = settings.groq_api_key or os.environ.get("GROQ_API_KEY")
    if not groq_api_key:
        raise ValueError("Missing GROQ_API_KEY")

    if not image_filepath:
        raise ValueError("Groq vision requires an image. Please upload a skin image.")

    image_data = encode_image(image_filepath)

    prompt = (
        "You are a confident, natural doctor specializing in skin care. Speak with the reassurance, clarity, and authority of a real doctor. "
        "Limit your entire response to two or three sentences maximum. "
        "If the patient has provided a video, explain that you are reviewing the uploaded image because this model cannot process video directly. "
        "Do not use any special characters, symbols, asterisks, or markdown formatting in your response because it will be converted directly to audio.\n\n"
        f"Patient text: {patient_text}"
    )

    if video_filepath:
        prompt += "\nThe patient also uploaded a video, but use the provided image as the visual reference."

    client = Groq(api_key=groq_api_key)
    response = client.chat.completions.create(
        model=settings.groq_model,
        max_completion_tokens=1000,
        messages=[
            {
                "role": "system",
                "content": "You are a careful skin care assistant. Give general information, not a diagnosis.",
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{image_data}"},
                    },
                ],
            },
        ],
    )

    return response.choices[0].message.content


def generate_full_consultation(patient_text: str, image_filepath: str, video_filepath: str | None = None) -> dict[str, Any]:
    """Generate both doctor guidance and product recommendations in one flow."""
    groq_api_key = settings.groq_api_key or os.environ.get("GROQ_API_KEY")
    if not groq_api_key:
        raise ValueError("Missing GROQ_API_KEY")

    image_data = encode_image(image_filepath)

    prompt = (
        "You are a confident, board-certified dermatologist. Speak with the reassurance, clarity, and authority of a real doctor.\n\n"
        "Provide your response in EXACTLY this format — two sections separated by '===PRODUCTS===':\n\n"
        "SECTION 1 (Medical Analysis): Give a 3-5 sentence analysis of the patient's skin concern. "
        "Describe what you observe, possible causes, and general care recommendations. "
        "Do NOT use markdown or special characters.\n\n"
        "SECTION 2 (Product Recommendations): From the list of REAL skincare products below, "
        "select 3-4 products that would help this specific patient. For each, mention:\n"
        "- Product name and brand\n"
        "- Why it helps this condition\n"
        "- Key active ingredients\n\n"
        "Available product catalog (only recommend from this list):\n"
        "1. CeraVe Foaming Facial Cleanser - Niacinamide, Ceramides, Hyaluronic Acid - For acne, oily skin\n"
        "2. CeraVe Moisturizing Cream - Ceramides, Hyaluronic Acid - For dry skin, eczema\n"
        "3. La Roche-Posay Effaclar Duo (+) - Salicylic Acid, Niacinamide - For acne, blemishes\n"
        "4. La Roche-Posay Cicaplast Baume B5 - Madecassoside, Panthenol - For irritated, damaged skin\n"
        "5. The Ordinary Niacinamide 10% + Zinc 1% - Niacinamide, Zinc - For acne, oil control\n"
        "6. The Ordinary Hyaluronic Acid 2% + B5 - Hyaluronic Acid - For hydration, dry skin\n"
        "7. Cetaphil Gentle Skin Cleanser - Gentle surfactants - For sensitive skin\n"
        "8. Neutrogena Hydro Boost Water Gel - Hyaluronic Acid - For hydration, all skin types\n"
        "9. Vanicream Moisturizing Cream - Minimal ingredients - For sensitive, allergy-prone skin\n"
        "10. Paula's Choice Skin Perfecting 2% BHA - Salicylic Acid - For acne, blackheads, texture\n"
        "11. EltaMD UV Clear SPF 46 - Niacinamide, Zinc Oxide - Sunscreen for acne-prone skin\n"
        "12. Differin Adapalene Gel 0.1% - Adapalene - For acne (OTC retinoid)\n"
        "13. CeraVe SA Cream for Rough & Bumpy Skin - Salicylic Acid, Ceramides - For keratosis pilaris\n"
        "14. Aveeno Daily Moisturizing Face Cream - Colloidal Oatmeal - For dry, sensitive skin\n"
        "15. Drunk Elephant Protini Polypeptide Cream - Peptides, Amino Acids - For anti-aging\n\n"
        f"Patient text: {patient_text}"
    )

    if video_filepath:
        prompt += "\nThe patient also uploaded a video, but use the provided image as the visual reference."

    client = Groq(api_key=groq_api_key)
    response = client.chat.completions.create(
        model=settings.groq_model,
        max_completion_tokens=1500,
        messages=[
            {
                "role": "system",
                "content": "You are a careful skin care assistant. Give general information, not a diagnosis. Always include product recommendations.",
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{image_data}"},
                    },
                ],
            },
        ],
    )

    content = response.choices[0].message.content

    # Split into analysis and products sections
    if "===PRODUCTS===" in content:
        parts = content.split("===PRODUCTS===")
        doctor_response = parts[0].strip()
        products_text = parts[1].strip() if len(parts) > 1 else ""
    else:
        doctor_response = content.strip()
        products_text = ""

    return {
        "doctor_response": doctor_response,
        "products_text": products_text,
    }

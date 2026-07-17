import re
import json
from groq import Groq
from config import settings
from .base_agent import BaseAgent


class ProductAgent(BaseAgent):
    name = "product"

    PRODUCT_CATALOG = [
        {"name": "CeraVe Foaming Facial Cleanser", "brand": "CeraVe", "ingredients": "Niacinamide, Ceramides, Hyaluronic Acid", "for": "acne, oily skin", "price_range": "$"},
        {"name": "CeraVe Moisturizing Cream", "brand": "CeraVe", "ingredients": "Ceramides, Hyaluronic Acid", "for": "dry skin, eczema", "price_range": "$"},
        {"name": "La Roche-Posay Effaclar Duo (+)", "brand": "La Roche-Posay", "ingredients": "Salicylic Acid, Niacinamide", "for": "acne, blemishes", "price_range": "$$"},
        {"name": "La Roche-Posay Cicaplast Baume B5", "brand": "La Roche-Posay", "ingredients": "Madecassoside, Panthenol", "for": "irritated, damaged skin", "price_range": "$$"},
        {"name": "The Ordinary Niacinamide 10% + Zinc 1%", "brand": "The Ordinary", "ingredients": "Niacinamide, Zinc", "for": "acne, oil control", "price_range": "$"},
        {"name": "The Ordinary Hyaluronic Acid 2% + B5", "brand": "The Ordinary", "ingredients": "Hyaluronic Acid", "for": "hydration, dry skin", "price_range": "$"},
        {"name": "Cetaphil Gentle Skin Cleanser", "brand": "Cetaphil", "ingredients": "Gentle surfactants", "for": "sensitive skin", "price_range": "$"},
        {"name": "Neutrogena Hydro Boost Water Gel", "brand": "Neutrogena", "ingredients": "Hyaluronic Acid", "for": "hydration, all skin types", "price_range": "$$"},
        {"name": "Vanicream Moisturizing Cream", "brand": "Vanicream", "ingredients": "Minimal ingredients", "for": "sensitive, allergy-prone skin", "price_range": "$$"},
        {"name": "Paula's Choice Skin Perfecting 2% BHA", "brand": "Paula's Choice", "ingredients": "Salicylic Acid", "for": "acne, blackheads, texture", "price_range": "$$"},
        {"name": "EltaMD UV Clear SPF 46", "brand": "EltaMD", "ingredients": "Niacinamide, Zinc Oxide", "for": "sunscreen, acne-prone", "price_range": "$$$"},
        {"name": "Differin Adapalene Gel 0.1%", "brand": "Differin", "ingredients": "Adapalene", "for": "acne (OTC retinoid)", "price_range": "$$"},
        {"name": "CeraVe SA Cream for Rough & Bumpy Skin", "brand": "CeraVe", "ingredients": "Salicylic Acid, Ceramides", "for": "keratosis pilaris", "price_range": "$"},
        {"name": "Aveeno Daily Moisturizing Face Cream", "brand": "Aveeno", "ingredients": "Colloidal Oatmeal", "for": "dry, sensitive skin", "price_range": "$"},
        {"name": "Drunk Elephant Protini Polypeptide Cream", "brand": "Drunk Elephant", "ingredients": "Peptides, Amino Acids", "for": "anti-aging", "price_range": "$$$"},
    ]

    def process(self, context: dict) -> dict:
        detections = context.get("detections", [])
        treatment = context.get("treatment", "")
        patient_text = context.get("patient_text", "")

        if not detections:
            return {"products_text": ""}

        top_disease = detections[0]["disease"]

        client = Groq(api_key=settings.groq_api_key)
        catalog_json = json.dumps(self.PRODUCT_CATALOG, indent=2)

        prompt = (
            f"A patient has been diagnosed with {top_disease}. Based on their condition and the treatment plan below, "
            f"recommend 3-4 products from the catalog.\n\n"
            f"Patient description: {patient_text}\n"
            f"Treatment plan: {treatment}\n\n"
            f"Available product catalog:\n{catalog_json}\n\n"
            "Select the most relevant products. For each, mention the product name, brand, why it helps this condition, "
            "and key active ingredients. Format as a clean list without markdown."
        )

        response = client.chat.completions.create(
            model=settings.groq_model,
            max_completion_tokens=800,
            messages=[
                {"role": "system", "content": "You are a skincare product expert. Recommend products based on dermatological needs."},
                {"role": "user", "content": prompt},
            ],
        )

        return {"products_text": response.choices[0].message.content}

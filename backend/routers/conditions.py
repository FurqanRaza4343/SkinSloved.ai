import json
import os
from fastapi import APIRouter, HTTPException
from mistralai import Mistral
from config import settings

router = APIRouter(prefix="/api/conditions", tags=["Conditions"])

KB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "conditions_kb.json")

def _load_kb() -> list[dict]:
    if not os.path.exists(KB_PATH):
        return []
    with open(KB_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


@router.get("")
async def list_conditions():
    return _load_kb()


@router.get("/{slug}")
async def get_condition(slug: str):
    kb = _load_kb()
    for c in kb:
        if c["slug"] == slug:
            return c
    raise HTTPException(status_code=404, detail="Condition not found")


ANALYZE_SYSTEM_PROMPT = """You are a professional dermatology AI assistant with deep medical knowledge. A user has asked you to analyze a skin condition based on the provided knowledge base information and their specific query.

You must provide a thorough, professional-grade analysis covering:
1. **Medical Overview** — What this condition is, its pathophysiology
2. **Clinical Presentation** — Typical signs, symptoms, and appearance
3. **Seasonality & Risk Factors** — When it occurs and who is most affected
4. **Treatment Options** — Evidence-based treatments from mild to severe
5. **Recommendations** — Specific actionable advice for this user

IMPORTANT RULES:
- Use the knowledge base as your primary source
- Supplement with your medical knowledge where appropriate
- Always include appropriate disclaimers
- Be thorough but accessible
- NEVER claim to replace a real dermatologist
- Keep the response under 500 words
- Use plain language a patient would understand"""


@router.post("/analyze/{slug}")
async def analyze_condition(slug: str, request: dict):
    kb = _load_kb()
    condition = None
    for c in kb:
        if c["slug"] == slug:
            condition = c
            break
    if not condition:
        raise HTTPException(status_code=404, detail="Condition not found")

    user_message = request.get("message", "")
    if not user_message:
        raise HTTPException(status_code=400, detail="message is required")

    if not settings.mistral_api_key:
        raise HTTPException(status_code=500, detail="AI service not configured (Mistral API key missing)")

    context = f"""Condition: {condition['name']}
Category: {condition['category']}
Severity: {condition['severity']}
Description: {condition['description']}
Causes: {condition.get('causes', 'Not specified')}
Symptoms: {', '.join(condition['symptoms'])}
Treatment: {condition['treatment']}
Risk Factors: {condition.get('risk_factors', 'Not specified')}
Seasonality: {condition.get('seasonality', 'Not specified')}
Prevention: {condition.get('prevention', 'Not specified')}
When to see doctor: {condition.get('when_to_see_doctor', 'Not specified')}"""

    client = Mistral(api_key=settings.mistral_api_key)
    response = client.chat.complete(
        model=settings.mistral_model,
        messages=[
            {"role": "system", "content": ANALYZE_SYSTEM_PROMPT},
            {"role": "user", "content": f"""Here is the knowledge base information about {condition['name']}:

{context}

The user's specific question/concern is:
"{user_message}"

Please provide a professional analysis based on this information."""},
        ],
        max_tokens=1500,
        temperature=0.3,
    )

    return {
        "condition": condition["name"],
        "slug": slug,
        "analysis": response.choices[0].message.content,
    }

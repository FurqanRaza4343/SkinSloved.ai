from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from agents.followup_agent import FollowUpAgent

router = APIRouter(prefix="/api/followup", tags=["Follow-up"])
followup_agent = FollowUpAgent()


class FollowUpRequest(BaseModel):
    text: str

    def model_post_init(self, __context):
        if len(self.text) > 5000:
            raise ValueError("Text too long (max 5000 chars)")


class FollowUpResponse(BaseModel):
    questions: list[str]


@router.post("/questions", response_model=FollowUpResponse)
async def get_followup_questions(request: FollowUpRequest):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text is required")
    questions = await followup_agent.generate_questions(request.text.strip()[:5000])
    return FollowUpResponse(questions=questions)

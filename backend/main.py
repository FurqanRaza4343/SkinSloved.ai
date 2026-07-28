from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from routers import consultation, followup, diary, conditions
from config import settings

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="AI Skin Specialist API",
    description="Multi-agent AI dermatology consultation platform",
    version="2.0.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(consultation.router)
app.include_router(consultation.transcribe_router)
app.include_router(followup.router)
app.include_router(diary.router)
app.include_router(conditions.router)


@app.get("/api/health")
@limiter.exempt
async def health_check():
    return {"status": "healthy", "service": "ai-skin-specialist-backend", "version": "2.0.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

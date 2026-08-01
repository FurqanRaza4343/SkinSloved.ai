import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from rate_limit import limiter
from routers import consultation, followup, diary, conditions
from config import settings

logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI Skin Specialist API",
    description="Multi-agent AI dermatology consultation platform",
    version="2.1.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


@app.middleware("http")
async def log_startup_config(request: Request, call_next):
    return await call_next(request)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(consultation.router)
app.include_router(consultation.transcribe_router)
app.include_router(followup.router)
app.include_router(diary.router)
app.include_router(conditions.router)


@app.on_event("startup")
async def startup_validation():
    missing = []
    if not settings.insforge_api_key:
        missing.append("INSFORGE_API_KEY")
    if not settings.groq_api_key:
        missing.append("GROQ_API_KEY")
    if missing:
        logger.warning(f"Missing required env vars: {', '.join(missing)}. Some features may not work.")


@app.get("/")
@limiter.exempt
async def root():
    return {"service": "AI Skin Specialist API", "version": "2.1.0", "docs": "/docs"}


@app.get("/api/health")
@limiter.exempt
async def health_check():
    return {"status": "healthy", "service": "ai-skin-specialist-backend", "version": "2.1.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

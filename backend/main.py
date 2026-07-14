"""AI Skin Specialist - FastAPI Backend Server"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import consultation
from config import settings

app = FastAPI(
    title="AI Skin Specialist API",
    description="Backend API for AI-powered dermatology consultations",
    version="1.0.0",
)

# CORS - allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(consultation.router)


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "ai-skin-specialist-backend"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

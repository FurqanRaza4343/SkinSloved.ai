import os
import uuid
import json
import logging
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from rate_limit import limiter
from routers import consultation, followup, diary, conditions, routine, scanner
from config import settings


class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if hasattr(record, "request_id"):
            log_entry["request_id"] = record.request_id
        if record.exc_info and record.exc_info[0]:
            log_entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_entry)


handler = logging.StreamHandler()
handler.setFormatter(JSONFormatter())
logging.basicConfig(level=logging.INFO, handlers=[handler])
logger = logging.getLogger(__name__)

API_VERSION = "2.3.0"
TEMP_DIR = os.path.join(os.path.dirname(__file__), "temp")


def cleanup_temp():
    if os.path.exists(TEMP_DIR):
        count = 0
        for f in os.listdir(TEMP_DIR):
            try:
                os.remove(os.path.join(TEMP_DIR, f))
                count += 1
            except OSError:
                pass
        if count:
            logger.info(f"Cleaned up {count} temp files on startup")


@asynccontextmanager
async def lifespan(app: FastAPI):
    cleanup_temp()
    missing = []
    if not settings.insforge_api_key:
        missing.append("INSFORGE_API_KEY")
    if not settings.groq_api_key:
        missing.append("GROQ_API_KEY")
    if missing:
        logger.warning(f"Missing env vars: {', '.join(missing)}. Some features may not work.")
    logger.info(f"AI Skin Specialist API v{API_VERSION} started")
    yield
    logger.info("Shutting down...")


app = FastAPI(
    title="AI Skin Specialist API",
    description="Multi-agent AI dermatology consultation platform",
    version=API_VERSION,
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


@app.middleware("http")
async def request_middleware(request: Request, call_next):
    request_id = str(uuid.uuid4())[:8]
    request.state.request_id = request_id
    adapter = logging.LoggerAdapter(logger, {"request_id": request_id})
    adapter.info(f"→ {request.method} {request.url.path}")
    response = await call_next(request)
    adapter.info(f"← {response.status_code}")
    if not isinstance(response, StreamingResponse):
        response.headers["X-Request-ID"] = request_id
        response.headers["X-API-Version"] = API_VERSION
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    req_id = getattr(request.state, "request_id", "unknown")
    logger.error(f"[{req_id}] Unhandled exception: {exc}", extra={"request_id": req_id}, exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error", "request_id": req_id})


app.include_router(consultation.router)
app.include_router(consultation.transcribe_router)
app.include_router(followup.router)
app.include_router(diary.router)
app.include_router(conditions.router)
app.include_router(routine.router)
app.include_router(scanner.router)


@app.get("/")
@limiter.exempt
async def root():
    return {"service": "AI Skin Specialist API", "version": API_VERSION, "docs": "/docs"}


@app.get("/api/health")
@limiter.exempt
async def health_check():
    return {"status": "healthy", "service": "ai-skin-specialist-backend", "version": API_VERSION}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)

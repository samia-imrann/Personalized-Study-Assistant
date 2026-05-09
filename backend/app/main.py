from contextlib import asynccontextmanager
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.api.routes import auth, quiz, performance, notes, collab
from app.services.ml_engine import get_model


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — pre-load ML model
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    model = get_model()
    if model:
        print("✅ ML recommender model loaded")
    else:
        print("⚠️  ML model not found — using DB fallback for recommendations")
    yield
    # Shutdown — nothing to clean up


app = FastAPI(
    title="AdaptIQ API",
    description="AI-Powered Personalized Study Assistant",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded files
uploads_dir = Path(settings.upload_dir)
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

# Register routers
app.include_router(auth.router)
app.include_router(quiz.router)
app.include_router(performance.router)
app.include_router(notes.router)
app.include_router(collab.router)


@app.get("/", tags=["Health"])
async def root():
    return {"status": "ok", "app": settings.app_name}


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy"}

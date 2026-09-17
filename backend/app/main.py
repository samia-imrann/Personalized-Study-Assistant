from contextlib import asynccontextmanager
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.api.routes import auth, quiz, performance, notes, collab, admin
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

    # Seed default admin user if none exists
    from app.db.session import AsyncSessionLocal
    from app.models.user import User
    from app.core.security import hash_password
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        try:
            res = await db.execute(select(User).where(User.email == "admin@adaptiq.com"))
            if not res.scalars().first():
                admin = User(
                    username="admin",
                    email="admin@adaptiq.com",
                    password_hash=hash_password("admin123"),
                    is_admin=True,
                )
                db.add(admin)
                await db.commit()
                print("👑 Seeded default admin user (admin@adaptiq.com / admin123)")
        except Exception as e:
            print(f"❌ Error seeding admin: {e}")
    yield
    # Shutdown — nothing to clean up


app = FastAPI(
    title="AdaptIQ API",
    description="AI-Powered Personalized Study Assistant",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
origins = settings.frontend_origins()
if "https://personalized-study-assistant.vercel.app" not in origins:
    origins.append("https://personalized-study-assistant.vercel.app")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
app.include_router(admin.router)


@app.get("/", tags=["Health"])
async def root():
    return {"status": "ok", "app": settings.app_name}


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy"}

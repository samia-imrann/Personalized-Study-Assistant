from pydantic_settings import BaseSettings
from pydantic import field_validator
from functools import lru_cache
import re


class Settings(BaseSettings):
    # App
    app_name: str = "AdaptIQ"
    debug: bool = True

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/adaptiq"
    database_url_sync: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/adaptiq"

    @field_validator("database_url", mode="before")
    def assemble_async_db_url(cls, v: str) -> str:
        if isinstance(v, str):
            if v.startswith("postgres://"):
                v = "postgresql+asyncpg://" + v[len("postgres://"):]
            elif v.startswith("postgresql://"):
                v = "postgresql+asyncpg://" + v[len("postgresql://"):]
            elif re.match(r"^postgresql\+[a-zA-Z0-9_]+://", v):
                v = re.sub(r"^postgresql\+[a-zA-Z0-9_]+://", "postgresql+asyncpg://", v)
        return v

    @field_validator("database_url_sync", mode="before")
    def assemble_sync_db_url(cls, v: str) -> str:
        if isinstance(v, str):
            if v.startswith("postgres://"):
                v = "postgresql+psycopg2://" + v[len("postgres://"):]
            elif v.startswith("postgresql://"):
                v = "postgresql+psycopg2://" + v[len("postgresql://"):]
            elif re.match(r"^postgresql\+[a-zA-Z0-9_]+://", v):
                v = re.sub(r"^postgresql\+[a-zA-Z0-9_]+://", "postgresql+psycopg2://", v)
        return v

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # JWT
    jwt_secret: str = "adaptiq-super-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 24

    # File Upload
    upload_dir: str = "uploads"
    max_upload_mb: int = 20

    # CORS
    frontend_url: str = "http://localhost:5173"

    class Config:
        env_file = "../.env"
        env_file_encoding = "utf-8"

    def frontend_origins(self) -> list[str]:
        origins = [origin.strip() for origin in self.frontend_url.split(",") if origin.strip()]
        defaults = ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"]
        return list(dict.fromkeys(origins + defaults))


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

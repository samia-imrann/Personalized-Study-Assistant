from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    app_name: str = "AdaptIQ"
    debug: bool = True

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/adaptiq"
    database_url_sync: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/adaptiq"

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

import os
from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import ConfigDict, field_validator

# Root directory
ROOT_DIR = Path(__file__).parent.parent

class Settings(BaseSettings):
    model_config = ConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True
    )
    
    # API
    API_TITLE: str = "FE524 AI Tutor API"
    API_VERSION: str = "0.1.0"
    API_DESCRIPTION: str = "Course-specific AI teaching assistant for FE524 Financial Engineering"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True
    RELOAD: bool = True

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:3001", "http://localhost:8000"]
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: list[str] = ["*"]
    CORS_ALLOW_HEADERS: list[str] = ["*"]

    # Database
    DATABASE_URL: str = f"sqlite:///{ROOT_DIR / 'data' / 'fe524_tutor.db'}"
    
    # Vector DB (Chroma)
    CHROMA_DB_PATH: str = str(ROOT_DIR / "data" / ".chroma")
    CHROMA_COLLECTION_NAME: str = "fe524_materials"

    # OpenAI
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"
    OPENAI_TEMPERATURE: float = 0.7

    # File Storage
    UPLOAD_DIR: str = str(ROOT_DIR / "data" / "uploads")
    MAX_UPLOAD_SIZE: int = 50 * 1024 * 1024  # 50MB

    # JWT
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # RAG
    CHUNK_SIZE: int = 1024
    CHUNK_OVERLAP: int = 200
    TOP_K_RESULTS: int = 5

    @field_validator("DEBUG", "RELOAD", mode="before")
    @classmethod
    def parse_bool_like_env(cls, value):
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"1", "true", "yes", "on", "debug", "development", "dev"}:
                return True
            if normalized in {"0", "false", "no", "off", "release", "production", "prod"}:
                return False
        return value

settings = Settings()

# Ensure directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.CHROMA_DB_PATH, exist_ok=True)

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    openrouter_api_key: str = ""
    openrouter_model: str = "anthropic/claude-3.5-sonnet"
    database_url: str = "sqlite:///./databases/session.db"
    redis_url: Optional[str] = None
    upload_dir: str = "./uploads"
    max_file_size_mb: int = 20
    query_timeout_seconds: int = 30
    default_limit: int = 100

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

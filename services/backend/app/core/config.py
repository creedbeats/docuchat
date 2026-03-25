from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://docuchat:docuchat_dev@localhost:5432/docuchat"
    OPENAI_API_KEY: str = ""
    OLLAMA_URL: str = "http://ollama:11434"
    OLLAMA_MODEL: str = "phi3:mini"
    UPLOAD_DIR: str = "/app/uploads"
    FASTAPI_DEBUG: bool = False

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()

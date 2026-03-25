from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://docuchat:docuchat_dev@localhost:5432/docuchat"
    OPENAI_API_KEY: str = ""
    UPLOAD_DIR: str = "/app/uploads"

    model_config = {"env_file": ".env"}


settings = Settings()

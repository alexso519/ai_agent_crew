from pydantic_settings import BaseSettings, SettingsConfigDict


class WorkerSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = (
        "postgresql+psycopg2://crewcc:crewcc_secret@postgres:5432/crewcc"
    )
    redis_url: str = "redis://redis:6379/0"
    ollama_base_url: str = "http://ollama:11434"


settings = WorkerSettings()

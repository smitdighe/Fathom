from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    CEREBRAS_API_KEY: str
    TAVILY_API_KEY: str
    DATABASE_URL: str | None = None
    MAX_ITERATIONS: int = 3
    ENVIRONMENT: str = "development"

    @field_validator("MAX_ITERATIONS")
    @classmethod
    def _check_max_iterations(cls, v: int) -> int:
        if not 1 <= v <= 3:
            raise ValueError("MAX_ITERATIONS must be between 1 and 3")
        return v


settings = Settings()

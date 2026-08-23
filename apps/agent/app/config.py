from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    litellm_proxy_url: str = "http://localhost:4000"
    litellm_master_key: str = ""
    port: int = 8000


settings = Settings()

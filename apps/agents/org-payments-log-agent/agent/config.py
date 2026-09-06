import os

from dotenv import load_dotenv

load_dotenv()


class ConfigError(RuntimeError):
    pass


def _require(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise ConfigError(f"Missing required environment variable: {name}")
    return value


class Config:
    def __init__(self):
        self.gemini_api_key = _require("GEMINI_API_KEY")
        self.llm_model = os.environ.get("LLM_MODEL", "gemini-flash-latest")


def load_config() -> Config:
    return Config()

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
        self.safeai_api_base_url = _require("SAFEAI_API_BASE_URL")
        self.safeai_agent_api_token = _require("SAFEAI_AGENT_API_TOKEN")
        self.gemini_api_key = _require("GEMINI_API_KEY")
        self.llm_model = os.environ.get("LLM_MODEL", "gemini-flash-latest")
        self.langchain_project = os.environ.get("LANGCHAIN_PROJECT", "safeai-inquiry-agent")


def load_config() -> Config:
    return Config()

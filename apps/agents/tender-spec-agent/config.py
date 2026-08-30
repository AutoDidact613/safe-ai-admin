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
        self.google_search_api_key = _require("GOOGLE_SEARCH_API_KEY")
        self.google_search_engine_id = _require("GOOGLE_SEARCH_ENGINE_ID")
        self.llm_model = os.environ.get("LLM_MODEL", "gemini-flash-latest")
        self.langchain_project = os.environ.get("LANGCHAIN_PROJECT", "safeai-tender-spec-agent")
        # Set by the CLI per-invocation, kept for parity with inquiry-agent's
        # Config shape even though this agent has no usage_tracker yet.
        self.thread_id = None


def load_config() -> Config:
    return Config()

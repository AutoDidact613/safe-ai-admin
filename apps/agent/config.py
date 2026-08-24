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
        self.gemini_embedding_model = os.environ.get(
            "GEMINI_EMBEDDING_MODEL", "gemini-embedding-001"
        )
        self.langchain_project = os.environ.get("LANGCHAIN_PROJECT", "safeai-inquiry-agent")
        self.mongodb_atlas_uri = _require("MONGODB_ATLAS_URI")
        # Set by the CLI per-invocation (not from env) - lets classify/draft_reply's
        # _call_gemini() key usage_tracker calls by thread_id without threading it
        # through every function signature.
        self.thread_id = None


def load_config() -> Config:
    return Config()

import os
import ssl

from dotenv import load_dotenv

load_dotenv()


class ConfigError(RuntimeError):
    pass


def _require(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise ConfigError(f"Missing required environment variable: {name}")
    return value


# ============================================================================
# ⚠️⚠️⚠️  INSECURE - LOCAL DEV ONLY - DELETE THIS BLOCK BEFORE PRODUCTION  ⚠️⚠️⚠️
# ============================================================================
# DISABLE_SSL_VERIFY_INSECURE_DEV_ONLY=true disables TLS certificate
# verification for EVERY outbound HTTPS call this process makes (Gemini,
# Google Custom Search, the SafeAI-613 server API, LangSmith) - not just one
# request. It's a workaround for developing behind an SSL-inspecting network
# filter (e.g. Netfree) whose swapped-in certificate fails normal validation.
#
# With this on, this process can no longer detect a real man-in-the-middle
# attack on any HTTPS call it makes. NEVER set this in staging/production.
# `grep -r DISABLE_SSL_VERIFY_INSECURE_DEV_ONLY` across the repo/.env files
# before any deploy and remove every trace of it.
if os.environ.get("DISABLE_SSL_VERIFY_INSECURE_DEV_ONLY", "false").lower() == "true":
    print(
        "⚠️  DISABLE_SSL_VERIFY_INSECURE_DEV_ONLY=true - TLS certificate "
        "verification is OFF for this process. Local dev only, never in production!"
    )

    _original_load_verify_locations = ssl.SSLContext.load_verify_locations

    def _unverified_load_verify_locations(self, *args, **kwargs):
        try:
            _original_load_verify_locations(self, *args, **kwargs)
        except Exception:
            pass
        self.check_hostname = False
        self.verify_mode = ssl.CERT_NONE

    # Patches the ssl.SSLContext class itself (not a specific library) so this
    # takes effect regardless of whether a given HTTP call goes through
    # requests/urllib3 or httpx (used internally by google-genai) - both build
    # an SSLContext and call load_verify_locations() on it.
    ssl.SSLContext.load_verify_locations = _unverified_load_verify_locations

    import urllib3

    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
# ============================================================================
# ⚠️⚠️⚠️  END OF INSECURE DEV-ONLY BLOCK  ⚠️⚠️⚠️
# ============================================================================


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

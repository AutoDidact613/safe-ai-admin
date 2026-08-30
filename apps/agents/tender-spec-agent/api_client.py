from typing import Any, Dict

import requests

from config import Config


class SafeAIClient:
    def __init__(self, config: Config):
        self._base_url = config.safeai_api_base_url.rstrip("/")
        self._session = requests.Session()
        self._session.headers.update(
            {"Authorization": f"Bearer {config.safeai_agent_api_token}"}
        )

    def fetch_tender_context(self, tender_id: str) -> Dict[str, Any]:
        # GET /tender-board/:id/agent-context
        # (server/src/controllers/tenderBoardController.ts:getTenderAgentContextHandler)
        response = self._session.get(f"{self._base_url}/tender-board/{tender_id}/agent-context")
        response.raise_for_status()
        return response.json()

    def save_specification(self, tender_id: str, specification: Dict[str, Any]) -> None:
        # POST /tender-board/:id/specification
        # (server/src/controllers/tenderBoardController.ts:saveTenderSpecificationHandler)
        response = self._session.post(
            f"{self._base_url}/tender-board/{tender_id}/specification",
            json=specification,
        )
        response.raise_for_status()

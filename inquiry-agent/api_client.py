from typing import List

import requests

from config import Config
from graph_state import Inquiry


class SafeAIClient:
    def __init__(self, config: Config):
        self._base_url = config.safeai_api_base_url.rstrip("/")
        self._session = requests.Session()
        self._session.headers.update(
            {"Authorization": f"Bearer {config.safeai_agent_api_token}"}
        )

    def fetch_open_inquiries(self) -> List[Inquiry]:
        # GET /contact/all (server/src/controllers/contactMessageController.ts:getAllRequests)
        # calls ContactMessage.find() with no filter and no ?status= query param support -
        # it returns every request regardless of status. We filter to 'open' here instead.
        response = self._session.get(f"{self._base_url}/contact/all")
        response.raise_for_status()
        all_requests = response.json()
        return [
            {
                "id": item["_id"],
                "title": item["title"],
                "description": item["description"],
            }
            for item in all_requests
            if item.get("status") == "open"
        ]

    def post_reply(self, inquiry_id: str, text: str) -> None:
        response = self._session.post(
            f"{self._base_url}/contact/my-requests/{inquiry_id}/reply",
            json={"text": text},
        )
        response.raise_for_status()

    def mark_handled(self, inquiry_id: str) -> None:
        response = self._session.patch(
            f"{self._base_url}/contact/my-requests/{inquiry_id}/close"
        )
        response.raise_for_status()

    def get_inquiry_details(self, inquiry_id: str) -> dict:
        response = self._session.get(f"{self._base_url}/contact/my-requests/{inquiry_id}")
        response.raise_for_status()
        return response.json()

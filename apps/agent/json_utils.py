import json
import re

_CODE_FENCE_RE = re.compile(r"^```(?:json)?\s*\n?(.*?)\n?```$", re.DOTALL)


def parse_json_response(text: str) -> dict:
    match = _CODE_FENCE_RE.match(text.strip())
    if match:
        text = match.group(1)
    return json.loads(text)

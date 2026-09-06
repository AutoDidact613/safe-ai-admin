from google import genai
from langsmith import traceable

from config import Config


@traceable
def embed_text(text: str, config: Config) -> list:
    client = genai.Client(api_key=config.gemini_api_key)
    response = client.models.embed_content(model=config.gemini_embedding_model, contents=text)
    return response.embeddings[0].values

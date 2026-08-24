import sys

import requests
from google.genai import errors as genai_errors
from pymongo import MongoClient

from api_client import SafeAIClient
from config import Config, ConfigError, load_config
from embeddings import embed_text


def index_articles(client: SafeAIClient, collection, config: Config) -> tuple:
    articles = client.fetch_all_articles()

    indexed = 0
    failed = 0
    for article in articles:
        try:
            text = f"{article['title']}\n{article['content']}"
            vector = embed_text(text, config)
            collection.update_one(
                {"slug": article["slug"]},
                {
                    "$set": {
                        "slug": article["slug"],
                        "title": article["title"],
                        "content": article["content"],
                        "category": article.get("category", ""),
                        "vector": vector,
                    },
                },
                upsert=True,
            )
            indexed += 1
        except genai_errors.APIError as e:
            print(f"נכשל אינדוקס המאמר '{article.get('slug')}': {e}")
            failed += 1

    return indexed, failed, len(articles)


def main() -> None:
    try:
        config = load_config()
        client = SafeAIClient(config)
        mongo_client = MongoClient(config.mongodb_atlas_uri)
        collection = mongo_client["inquiry_agent_knowledge"]["article_embeddings"]

        indexed, failed, total = index_articles(client, collection, config)
        print(f"אונדקסו {indexed} מאמרים, נכשלו {failed}, מתוך {total} סה\"כ.")
    except ConfigError as e:
        sys.exit(f"שגיאת הגדרות: {e}")
    except requests.exceptions.RequestException as e:
        sys.exit(f"שגיאת תקשורת עם השרת: {e}")


if __name__ == "__main__":
    main()

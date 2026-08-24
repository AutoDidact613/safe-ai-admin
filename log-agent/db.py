import os
from pymongo import MongoClient
from pymongo.database import Database
from dotenv import load_dotenv

load_dotenv()


def get_database() -> Database:
    """
    Connects to MongoDB Atlas using the connection string from the .env file
    and returns the database object.
    """
    mongo_uri = os.getenv("MONGO_URI")
    if not mongo_uri:
        raise ValueError("MONGO_URI is not set in the .env file")

    client = MongoClient(mongo_uri)

    db = client["safeai"]
    return db


if __name__ == "__main__":
    # Quick manual check: run this file directly to verify the connection works
    db = get_database()
    print("Connected to database:", db.name)
    print("Collections found:", db.list_collection_names())
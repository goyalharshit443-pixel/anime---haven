import sqlite3
import pathlib
import uuid
from datetime import datetime

ROOT = pathlib.Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "data" / "database.sqlite"

CATEGORY_TABLES = ["shonen", "shojo", "seinen", "josei", "kodomomuke"]


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def ensure_tables():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "CREATE TABLE IF NOT EXISTS scraped_sources ("
        "id TEXT PRIMARY KEY,"
        "anime_id TEXT NOT NULL,"
        "category TEXT NOT NULL,"
        "source_name TEXT NOT NULL,"
        "source_url TEXT NOT NULL,"
        "scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP"
        ")"
    )

    cursor.execute(
        "CREATE TABLE IF NOT EXISTS episodes ("
        "id TEXT PRIMARY KEY,"
        "anime_id TEXT NOT NULL,"
        "category TEXT NOT NULL,"
        "episode_number INTEGER,"
        "title TEXT,"
        "description TEXT,"
        "duration TEXT,"
        "video_url TEXT,"
        "released_at DATETIME,"
        "created_at DATETIME DEFAULT CURRENT_TIMESTAMP"
        ")"
    )

    for table in CATEGORY_TABLES:
        try:
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN description TEXT;")
        except sqlite3.OperationalError:
            pass

    conn.commit()
    conn.close()


def sanitize_category(category: str) -> str:
    if category not in CATEGORY_TABLES:
        raise ValueError(f"Unsupported anime category: {category}")
    return category


def upsert_anime(category: str, anime: dict) -> str:
    category = sanitize_category(category)
    conn = get_connection()
    cursor = conn.cursor()

    anime_id = anime.get("id") or str(uuid.uuid4())
    title = anime.get("title")
    author = anime.get("author")
    description = anime.get("description")
    video_url = anime.get("video_url")
    photo_url = anime.get("photo_url")
    tags = anime.get("tags")
    created_at = anime.get("created_at")

    cursor.execute(
        f"INSERT OR REPLACE INTO {category} "
        "(id, title, author, description, video_url, photo_url, tags, created_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))",
        [anime_id, title, author, description, video_url, photo_url, tags, created_at],
    )

    conn.commit()
    conn.close()
    return anime_id


def add_episodes(category: str, anime_id: str, episodes: list[dict]):
    category = sanitize_category(category)
    conn = get_connection()
    cursor = conn.cursor()

    for episode in episodes:
        episode_id = episode.get("id") or str(uuid.uuid4())
        cursor.execute(
            "INSERT OR REPLACE INTO episodes "
            "(id, anime_id, category, episode_number, title, description, duration, video_url, released_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                episode_id,
                anime_id,
                category,
                episode.get("episode_number"),
                episode.get("title"),
                episode.get("description"),
                episode.get("duration"),
                episode.get("video_url"),
                episode.get("released_at"),
            ],
        )

    conn.commit()
    conn.close()


def log_source(category: str, anime_id: str, source_name: str, source_url: str):
    category = sanitize_category(category)
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO scraped_sources (id, anime_id, category, source_name, source_url, scraped_at) VALUES (?, ?, ?, ?, ?, ?)",
        [str(uuid.uuid4()), anime_id, category, source_name, source_url, datetime.utcnow().isoformat()],
    )
    conn.commit()
    conn.close()

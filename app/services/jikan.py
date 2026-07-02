"""Async Jikan API client with local mock data fallback."""

import json
import logging
from pathlib import Path

import httpx

logger = logging.getLogger(__name__)

JIKAN_BASE_URL = "https://api.jikan.moe/v4"
JIKAN_TIMEOUT = 10.0
MOCK_DATA_PATH = Path(__file__).parent.parent.parent / "mock_anime_data.json"

# Genre name to MAL genre ID mapping (from Jikan /genres/anime endpoint)
GENRE_MAP: dict[str, int] = {
    "action": 1,
    "adventure": 2,
    "comedy": 4,
    "drama": 8,
    "fantasy": 10,
    "horror": 14,
    "mystery": 7,
    "romance": 22,
    "sci-fi": 24,
    "science fiction": 24,
    "slice of life": 36,
    "sports": 30,
    "supernatural": 37,
    "suspense": 41,
    "thriller": 41,
    "psychological": 40,
    "mecha": 18,
    "music": 19,
    "historical": 13,
    "military": 38,
    "isekai": 62,
    "school": 23,
    "shounen": 27,
    "seinen": 42,
    "shoujo": 25,
    "josei": 43,
    "harem": 35,
    "martial arts": 17,
    "space": 29,
    "vampire": 32,
    "samurai": 21,
    "parody": 20,
    "super power": 31,
    "mythology": 6,
    "detective": 39,
    "workplace": 48,
    "racing": 3,
    "survival": 76,
    "time travel": 78,
    "reincarnation": 72,
    "mahou shoujo": 66,
    "magical girl": 66,
}


def _load_mock_data() -> list[dict]:
    """Load fallback anime data from the local JSON file."""
    with open(MOCK_DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _resolve_genre_ids(genres: list[str]) -> list[int]:
    """Convert genre name strings to Jikan MAL genre IDs."""
    ids = []
    for genre in genres:
        genre_lower = genre.lower().strip()
        if genre_lower in GENRE_MAP:
            ids.append(GENRE_MAP[genre_lower])
    return ids


def _normalize_anime(raw: dict) -> dict:
    """Extract a consistent anime shape from Jikan API response data."""
    return {
        "mal_id": raw.get("mal_id"),
        "title": raw.get("title", "Unknown"),
        "synopsis": raw.get("synopsis", "No synopsis available."),
        "score": raw.get("score", 0),
        "episodes": raw.get("episodes", 0),
        "url": raw.get("url", ""),
        "image_url": (
            raw.get("images", {}).get("jpg", {}).get("image_url", "")
        ),
        "genres": [g["name"] for g in raw.get("genres", [])],
    }


async def fetch_anime(
    genres: list[str],
    http_client: httpx.AsyncClient,
    limit: int = 5,
) -> list[dict]:
    """
    Fetch anime from Jikan API filtered by genres, with automatic fallback.

    Args:
        genres: List of genre name strings (e.g., ["action", "drama"]).
        http_client: Shared httpx.AsyncClient instance.
        limit: Maximum number of anime to return.

    Returns:
        List of normalized anime dicts.
    """
    genre_ids = _resolve_genre_ids(genres)

    try:
        params: dict = {
            "order_by": "score",
            "sort": "desc",
            "limit": limit,
            "sfw": "true",
        }
        if genre_ids:
            params["genres"] = ",".join(str(gid) for gid in genre_ids)

        response = await http_client.get(
            f"{JIKAN_BASE_URL}/anime",
            params=params,
            timeout=JIKAN_TIMEOUT,
        )
        response.raise_for_status()

        data = response.json()
        anime_list = data.get("data", [])

        if not anime_list:
            logger.warning("Jikan returned empty results, using mock data fallback.")
            return _load_mock_data()

        return [_normalize_anime(anime) for anime in anime_list[:limit]]

    except (httpx.TimeoutException, httpx.HTTPStatusError, httpx.ConnectError) as e:
        logger.warning(f"Jikan API request failed ({type(e).__name__}: {e}), using mock data fallback.")
        return _load_mock_data()
    except Exception as e:
        logger.error(f"Unexpected error fetching from Jikan ({type(e).__name__}: {e}), using mock data fallback.")
        return _load_mock_data()

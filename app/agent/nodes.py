"""LangGraph node functions for the recommendation agent pipeline."""

import json
import logging

from langchain_core.messages import AIMessage, HumanMessage

from app.services.jikan import fetch_anime
from app.services.openrouter import call_openrouter

logger = logging.getLogger(__name__)

EXTRACTION_SYSTEM_PROMPT = """You are a preference extraction engine. Given a user's message about anime they want to watch, extract structured preferences as JSON.

Return ONLY a valid JSON object with exactly these keys:
- "genres": array of genre strings (e.g., ["action", "psychological", "thriller"]). Use common genre names: action, adventure, comedy, drama, fantasy, horror, mystery, romance, sci-fi, slice of life, sports, supernatural, suspense, psychological, mecha, isekai, school, historical, military, thriller, detective, space, vampire, samurai, super power, mythology, martial arts, mahou shoujo, survival, time travel, reincarnation.
- "mood": a single string describing the overall tone/mood (e.g., "dark", "uplifting", "intense", "relaxing", "emotional"). Use "" if not detectable.
- "similar_to": array of anime title strings the user referenced (e.g., ["Death Note", "Attack on Titan"]). Use [] if none mentioned.

Examples:
User: "I want something dark and psychological like Death Note"
{"genres": ["psychological", "thriller", "mystery"], "mood": "dark", "similar_to": ["Death Note"]}

User: "Give me a fun comedy isekai"
{"genres": ["comedy", "isekai"], "mood": "fun", "similar_to": []}

User: "something like Attack on Titan but with more romance"
{"genres": ["action", "drama", "romance"], "mood": "intense", "similar_to": ["Attack on Titan"]}

Return ONLY the JSON. No markdown fences, no explanations, no commentary."""

RESPONSE_SYSTEM_PROMPT = """You are AniBot, an expert anime recommendation assistant. You speak enthusiastically about anime, use anime terminology naturally, and provide detailed, personalized recommendations based on user preferences.

Format your response in markdown:
- Use **bold** for anime titles
- Use bullet points for listing recommendations
- Include the MAL score when available
- Provide a brief, compelling reason why each anime matches the user's request
- Add a MyAnimeList link for each recommendation when a URL is available
- Keep your tone warm, knowledgeable, and genuinely excited about great anime
- Limit to the anime data provided — do not invent titles or data not in the context

If the anime data is empty or insufficient, politely acknowledge the limitation and suggest the user try different keywords."""


async def extract_preferences(state: dict) -> dict:
    """Extract genre, mood, and comparison preferences from the user message via LLM."""
    user_message = state["user_message"]
    http_client = state["http_client"]

    messages = [
        {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
        {"role": "user", "content": user_message},
    ]

    try:
        raw_response = await call_openrouter(messages, http_client)

        # Strip markdown code fences if present
        cleaned = raw_response.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[-1]
        if cleaned.endswith("```"):
            cleaned = cleaned.rsplit("```", 1)[0]
        cleaned = cleaned.strip()

        parsed = json.loads(cleaned)

        return {
            "genres": parsed.get("genres", []),
            "mood": parsed.get("mood", ""),
            "similar_to": parsed.get("similar_to", []),
        }
    except (json.JSONDecodeError, ValueError) as e:
        logger.warning(f"Failed to parse LLM extraction response: {e}. Using defaults.")
        return {
            "genres": [],
            "mood": "",
            "similar_to": [],
        }
    except Exception as e:
        logger.error(f"Extraction node error: {e}. Using defaults.")
        return {
            "genres": [],
            "mood": "",
            "similar_to": [],
        }


async def fetch_recommendations(state: dict) -> dict:
    """Fetch anime recommendations from Jikan API based on extracted genres."""
    genres = state.get("genres", [])
    http_client = state["http_client"]

    anime_results = await fetch_anime(
        genres=genres,
        http_client=http_client,
        limit=5,
    )

    return {"anime_results": anime_results}


async def generate_response(state: dict) -> dict:
    """Generate the final recommendation response via OpenRouter LLM call."""
    user_message = state["user_message"]
    mood = state.get("mood", "")
    similar_to = state.get("similar_to", [])
    anime_results = state.get("anime_results", [])
    http_client = state["http_client"]

    # Build context block from anime data
    anime_context_lines = []
    for i, anime in enumerate(anime_results, 1):
        genres_str = ", ".join(anime.get("genres", []))
        anime_context_lines.append(
            f"{i}. Title: {anime.get('title', 'Unknown')}\n"
            f"   Score: {anime.get('score', 'N/A')}/10\n"
            f"   Episodes: {anime.get('episodes', 'N/A')}\n"
            f"   Genres: {genres_str}\n"
            f"   Synopsis: {anime.get('synopsis', 'No synopsis available.')}\n"
            f"   URL: {anime.get('url', 'N/A')}"
        )
    anime_context = "\n\n".join(anime_context_lines)

    # Build user prompt with all context
    user_prompt_parts = [f"User's request: {user_message}"]
    if mood:
        user_prompt_parts.append(f"Detected mood/tone: {mood}")
    if similar_to:
        user_prompt_parts.append(f"Similar to: {', '.join(similar_to)}")
    user_prompt_parts.append(f"\nAnime data to recommend from:\n\n{anime_context}")

    user_prompt = "\n".join(user_prompt_parts)

    messages = [
        {"role": "system", "content": RESPONSE_SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]

    response_text = await call_openrouter(messages, http_client)

    return {
        "messages": [
            HumanMessage(content=user_message),
            AIMessage(content=response_text),
        ],
    }

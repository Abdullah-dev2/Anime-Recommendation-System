"""LangGraph node functions for the recommendation agent pipeline."""

import json
import logging
import re
import httpx

from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.runnables import chain

from app.config import settings
from app.services.jikan import fetch_anime
from app.services.openrouter import OPENROUTER_URL, call_openrouter

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

SEED_EXTRACTION_SYSTEM_PROMPT = """You are an anime franchise extraction engine. Given a list of similar anime titles or a user request, extract the core franchise or IP name(s), including any common variations, English titles, or Romaji titles.
Strip out specific season numbers, part numbers, sequel/prequel suffixes, movie subtitles, spin-off subtitles, or release years.

Return ONLY a valid JSON list of strings representing the core IP/franchise names. If no seed anime is mentioned, return an empty list [].

Examples:
Input: {"similar_to": ["Mushoku Tensei: Jobless Reincarnation Season 2", "Mushoku Tensei"], "user_message": "Mushoku Tensei is great"}
Output: ["Mushoku Tensei", "Jobless Reincarnation"]

Input: {"similar_to": ["Attack on Titan Season 4 Part 2"], "user_message": "similar to Attack on Titan Season 4 Part 2"}
Output: ["Attack on Titan", "Shingeki no Kyojin"]

Input: {"similar_to": ["Naruto Shippuden"], "user_message": "Naruto Shippuden"}
Output: ["Naruto"]

Input: {"similar_to": [], "user_message": "Looking for action shows"}
Output: []

Return ONLY the JSON list of strings. No markdown code fences, no explanations, no commentary."""

RESPONSE_SYSTEM_PROMPT = """You are AniBot, an expert anime recommendation assistant. You speak enthusiastically about anime, use anime terminology naturally, and provide detailed, personalized recommendations based on user preferences.

Format your response in markdown:
- Use **bold** for anime titles
- Use bullet points for listing recommendations
- Include the MAL score when available
- Provide a brief, compelling reason why each anime matches the user's request
- Add a MyAnimeList link for each recommendation when a URL is available
- Keep your tone warm, knowledgeable, and genuinely excited about great anime
- Limit to the anime data provided — do not invent titles or data not in the context
- IMPORTANT: When listing and recommending anime, only refer to the overarching franchise name (e.g. use **Re:Zero** or **Naruto**). Do NOT include any season or part numbers (like "Season 2", "Part 2", "3rd Season") in the headers or titles of the recommended items. Present recommendations as franchise-level suggestions.

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
    limit = state.get("search_limit", 5)
    http_client = state["http_client"]

    logger.info(f"Fetching recommendations with genres={genres}, limit={limit}")
    anime_results = await fetch_anime(
        genres=genres,
        http_client=http_client,
        limit=limit,
    )

    return {"raw_retrieved_docs": anime_results}


async def extract_seed_anime(state: dict) -> dict:
    """Extract base franchise or IP names from the user query and similar_to list."""
    similar_to = state.get("similar_to", [])
    user_message = state["user_message"]
    http_client = state["http_client"]

    if not similar_to and not user_message:
        return {"seed_ips": []}

    input_data = {
        "similar_to": similar_to,
        "user_message": user_message
    }

    messages = [
        {"role": "system", "content": SEED_EXTRACTION_SYSTEM_PROMPT},
        {"role": "user", "content": json.dumps(input_data)},
    ]

    try:
        raw_response = await call_openrouter(messages, http_client)
        cleaned = raw_response.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[-1]
        if cleaned.endswith("```"):
            cleaned = cleaned.rsplit("```", 1)[0]
        cleaned = cleaned.strip()

        parsed = json.loads(cleaned)
        if isinstance(parsed, list):
            seed_ips = [item.strip() for item in parsed if isinstance(item, str)]
            logger.info(f"Extracted seed anime IPs: {seed_ips}")
            return {"seed_ips": seed_ips}
        else:
            logger.warning(f"Unexpected JSON format from seed extraction: {parsed}")
            return {"seed_ips": []}
    except Exception as e:
        logger.error(f"Seed anime extraction node error: {e}. Using empty.")
        return {"seed_ips": []}


async def filter_recommendations(state: dict) -> dict:
    """Filter out anime recommendations that belong to the user's seed anime franchise."""
    raw_docs = state.get("raw_retrieved_docs", []) or []
    seed_ips = state.get("seed_ips", [])
    filtered_titles = state.get("filtered_titles", []) or []
    
    if not seed_ips:
        return {"raw_retrieved_docs": raw_docs, "filtered_titles": filtered_titles}

    valid_results = []
    new_filtered_titles = list(filtered_titles)

    for anime in raw_docs:
        title = anime.get("title", "")
        is_franchise = False
        title_lower = title.lower()
        
        for seed in seed_ips:
            seed_lower = seed.lower().strip()
            if not seed_lower:
                continue
            
            if seed_lower in title_lower or title_lower in seed_lower:
                is_franchise = True
                break
                
        if is_franchise:
            logger.info(f"Filtering out sequel/spin-off title: {title}")
            if title not in new_filtered_titles:
                new_filtered_titles.append(title)
        else:
            valid_results.append(anime)

    return {
        "raw_retrieved_docs": valid_results,
        "filtered_titles": new_filtered_titles
    }


def clean_franchise_title(title: str) -> str:
    """Strip season numbers, parts, cours, and years to get the franchise base name, keeping original case."""
    t = title
    
    # Remove parenthetical years (e.g. (2011))
    t = re.sub(r'\(\d{4}\)', '', t, flags=re.IGNORECASE)
    
    # Remove ordinal season numbers: "1st season", "2nd season", etc.
    t = re.sub(r'\b\d+(?:st|nd|rd|th)\s+season\b', '', t, flags=re.IGNORECASE)
    
    # Remove "season \d+", "part \d+", "cour \d+", "s\d+"
    t = re.sub(r'\bseason\s+\d+\b', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\bpart\s+\d+\b', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\bcour\s+\d+\b', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\bs\d+\b', '', t, flags=re.IGNORECASE)
    
    # Remove Roman numerals at the end of the title: " II", " III", " IV", " V", " VI"
    t = re.sub(r'\b(?:ii|iii|iv|v|vi)\b$', '', t, flags=re.IGNORECASE)
    
    # Strip trailing space and numbers 2-9
    t = re.sub(r'\s+\b[2-9]\b$', '', t)
    
    # Clean up excess spaces and trailing punctuation
    t = re.sub(r'\s+', ' ', t)
    t = t.strip(" -:,;._")
    
    return t


def is_base_season(title: str) -> bool:
    """Check if the title is likely the base/starting season (Season 1)."""
    title_lower = title.lower()
    indicators = [
        "season", "part", "cour", " ii", " iii", " iv", " 2nd", " 3rd", " 4th",
        # Match trailing space followed by numbers 2-9
        " 2", " 3", " 4", " 5", " 6", " 7", " 8", " 9"
    ]
    for ind in indicators:
        if ind in title_lower:
            return False
    return True


async def deduplicate_franchises_node(state: dict) -> dict:
    """Group filtered raw docs by franchise key and keep only one representative per franchise, aggregating metadata."""
    raw_docs = state.get("raw_retrieved_docs", []) or []
    
    if not raw_docs:
        return {"anime_results": []}

    groups = {}
    for doc in raw_docs:
        title = doc.get("title", "")
        # Use lowercase key for grouping, but keep original case in titles
        key = clean_franchise_title(title).lower()
        if key not in groups:
            groups[key] = []
        groups[key].append(doc)

    deduplicated = []
    for key, docs in groups.items():
        # Representative Selection Strategy:
        # Prefer the base entry (Season 1/original) if it exists, otherwise keep first entry (highest score).
        representative_src = None
        for doc in docs:
            if is_base_season(doc.get("title", "")):
                representative_src = doc
                break
        if not representative_src:
            representative_src = docs[0]
            
        representative = dict(representative_src)
        
        # Data Transformation: Set overarching franchise title
        representative["title"] = clean_franchise_title(representative["title"])
        
        # Metadata aggregation:
        # Sum the episode counts of all matched season entries.
        # Average the scores of all matched season entries.
        total_episodes = 0
        score_sum = 0.0
        score_count = 0
        
        for doc in docs:
            ep = doc.get("episodes", 0)
            if ep:
                total_episodes += ep
                
            sc = doc.get("score", 0.0)
            if sc:
                score_sum += sc
                score_count += 1
                
        representative["episodes"] = total_episodes
        if score_count > 0:
            representative["score"] = round(score_sum / score_count, 2)
        else:
            representative["score"] = 0.0
            
        deduplicated.append(representative)

    # Sort the deduplicated results by score in descending order
    deduplicated.sort(key=lambda x: x.get("score", 0), reverse=True)
    
    # Keep the top 5 results for recommendation
    final_results = deduplicated[:5]
    logger.info(f"Deduplicated franchises: {len(raw_docs)} raw docs down to {len(final_results)} unique franchises.")
    
    return {"anime_results": final_results}


async def expand_search(state: dict) -> dict:
    """Increment iteration count and expand search limit to get more results next time."""
    iteration = state.get("iteration", 0) + 1
    current_limit = state.get("search_limit", 5)
    new_limit = current_limit + 5
    logger.info(f"Expanding search parameters: iteration={iteration}, new limit={new_limit}")
    return {
        "iteration": iteration,
        "search_limit": new_limit
    }


async def call_openrouter_stream(
    messages: list[dict[str, str]],
    http_client: httpx.AsyncClient,
):
    """Send a chat completion request to OpenRouter and yield assistant's reply chunk-by-chunk."""
    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "HTTP-Referer": "http://localhost:8000",
        "X-Title": "Anime Recommendation System",
        "Content-Type": "application/json",
    }

    payload = {
        "model": settings.openrouter_model,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 1024,
        "stream": True,
    }

    async with http_client.stream(
        "POST",
        OPENROUTER_URL,
        headers=headers,
        json=payload,
        timeout=30.0,
    ) as response:
        response.raise_for_status()
        async for line in response.aiter_lines():
            line = line.strip()
            if not line:
                continue
            if line.startswith("data: "):
                data_str = line[6:]
                if data_str == "[DONE]":
                    break
                try:
                    data = json.loads(data_str)
                    choices = data.get("choices", [])
                    if choices:
                        delta = choices[0].get("delta", {})
                        content = delta.get("content", "")
                        if content:
                            yield content
                except json.JSONDecodeError:
                    continue


@chain
async def stream_llm(input_data: dict):
    """LangChain chain that calls OpenRouter in streaming mode."""
    messages = input_data["messages"]
    http_client = input_data["http_client"]
    async for chunk in call_openrouter_stream(messages, http_client):
        yield chunk


async def generate_response(state: dict) -> dict:
    """Generate the final recommendation response via OpenRouter LLM call, collecting chunks."""
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

    response_text = ""
    async for chunk in stream_llm.astream({"messages": messages, "http_client": http_client}):
        response_text += chunk

    return {
        "messages": [
            HumanMessage(content=user_message),
            AIMessage(content=response_text),
        ],
    }

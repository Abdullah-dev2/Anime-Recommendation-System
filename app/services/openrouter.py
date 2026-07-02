"""Async HTTP client for OpenRouter chat completions API."""

import httpx

from app.config import settings

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"


async def call_openrouter(
    messages: list[dict[str, str]],
    http_client: httpx.AsyncClient,
) -> str:
    """
    Send a chat completion request to OpenRouter and return the assistant's reply.

    Args:
        messages: List of message dicts with 'role' and 'content' keys.
        http_client: Shared httpx.AsyncClient instance.

    Returns:
        The assistant's response text.

    Raises:
        httpx.HTTPStatusError: If OpenRouter returns a non-2xx status.
        httpx.TimeoutException: If the request times out.
        ValueError: If the response structure is unexpected.
    """
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
    }

    response = await http_client.post(
        OPENROUTER_URL,
        headers=headers,
        json=payload,
        timeout=30.0,
    )
    response.raise_for_status()

    data = response.json()

    choices = data.get("choices")
    if not choices or not isinstance(choices, list) or len(choices) == 0:
        raise ValueError(f"Unexpected OpenRouter response structure: {data}")

    content = choices[0].get("message", {}).get("content", "")
    if not content:
        raise ValueError(f"Empty content in OpenRouter response: {data}")

    return content

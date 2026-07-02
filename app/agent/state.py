"""LangGraph agent state schema."""

from typing import Annotated, TypedDict

from langchain_core.messages import AnyMessage
from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    """Typed state schema for the LangGraph recommendation agent.

    Fields:
        messages: Conversation message history managed by add_messages reducer.
        user_message: The raw user input string for the current request.
        session_id: UUID string identifying the session.
        genres: Extracted genre preferences (e.g., ["action", "psychological"]).
        mood: Extracted mood/tone preference (e.g., "dark", "uplifting").
        similar_to: Anime titles the user referenced for comparison.
        anime_results: Normalized anime data fetched from Jikan or mock fallback.
    """

    messages: Annotated[list[AnyMessage], add_messages]
    user_message: str
    session_id: str
    genres: list[str]
    mood: str
    similar_to: list[str]
    seed_ips: list[str]
    raw_retrieved_docs: list[dict]
    anime_results: list[dict]
    filtered_titles: list[str]
    search_limit: int
    iteration: int
    max_iterations: int

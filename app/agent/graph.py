"""LangGraph graph compilation and execution entry point."""

import httpx
from langgraph.graph import END, StateGraph

from app.agent.nodes import (
    extract_preferences,
    fetch_recommendations,
    generate_response,
)
from app.agent.state import AgentState

# Build the graph
workflow = StateGraph(AgentState)

# Add nodes
workflow.add_node("extract_preferences", extract_preferences)
workflow.add_node("fetch_recommendations", fetch_recommendations)
workflow.add_node("generate_response", generate_response)

# Define edges: linear pipeline
workflow.set_entry_point("extract_preferences")
workflow.add_edge("extract_preferences", "fetch_recommendations")
workflow.add_edge("fetch_recommendations", "generate_response")
workflow.add_edge("generate_response", END)

# Compile
agent = workflow.compile()


async def run_agent(
    user_message: str,
    session_id: str,
    http_client: httpx.AsyncClient,
) -> str:
    """
    Execute the recommendation agent pipeline for a single user message.

    Args:
        user_message: The raw user input string.
        session_id: UUID string for session tracking.
        http_client: Shared httpx.AsyncClient for all HTTP calls.

    Returns:
        The AI-generated recommendation response string.
    """
    initial_state: dict = {
        "messages": [],
        "user_message": user_message,
        "session_id": session_id,
        "genres": [],
        "mood": "",
        "similar_to": [],
        "anime_results": [],
        "http_client": http_client,
    }

    result = await agent.ainvoke(initial_state)

    # Extract the last AI message from the state
    messages = result.get("messages", [])
    for msg in reversed(messages):
        if hasattr(msg, "content") and msg.type == "ai":
            return msg.content

    return "I apologize, but I was unable to generate a recommendation. Please try again with a different request."

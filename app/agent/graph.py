"""LangGraph graph compilation and execution entry point."""

import httpx
from langgraph.graph import END, StateGraph

from app.agent.nodes import (
    deduplicate_franchises_node,
    expand_search,
    extract_preferences,
    extract_seed_anime,
    fetch_recommendations,
    filter_recommendations,
    generate_response,
)
from app.agent.state import AgentState


def should_continue(state: AgentState) -> str:
    """Determine whether to fetch more results or proceed to generate response."""
    results = state.get("anime_results", [])
    iteration = state.get("iteration", 0)
    max_iterations = state.get("max_iterations", 3)

    if not results and iteration < max_iterations:
        return "expand_search"
    return "generate_response"


# Build the graph
workflow = StateGraph(AgentState)

# Add nodes
workflow.add_node("extract_preferences", extract_preferences)
workflow.add_node("extract_seed_anime", extract_seed_anime)
workflow.add_node("fetch_recommendations", fetch_recommendations)
workflow.add_node("filter_recommendations", filter_recommendations)
workflow.add_node("deduplicate_franchises", deduplicate_franchises_node)
workflow.add_node("expand_search", expand_search)
workflow.add_node("generate_response", generate_response)

# Define edges
workflow.set_entry_point("extract_preferences")
workflow.add_edge("extract_preferences", "extract_seed_anime")
workflow.add_edge("extract_seed_anime", "fetch_recommendations")
workflow.add_edge("fetch_recommendations", "filter_recommendations")
workflow.add_edge("filter_recommendations", "deduplicate_franchises")

# Conditional edge from deduplicate_franchises
workflow.add_conditional_edges(
    "deduplicate_franchises",
    should_continue,
    {
        "expand_search": "expand_search",
        "generate_response": "generate_response",
    },
)

# Loop back edge
workflow.add_edge("expand_search", "fetch_recommendations")
workflow.add_edge("generate_response", END)

# Compile
agent = workflow.compile()


async def run_agent(
    user_message: str,
    session_id: str,
    http_client: httpx.AsyncClient,
) -> dict:
    """
    Execute the recommendation agent pipeline for a single user message.

    Args:
        user_message: The raw user input string.
        session_id: UUID string for session tracking.
        http_client: Shared httpx.AsyncClient for all HTTP calls.

    Returns:
        A dictionary containing the generated response, extracted seed IPs, and filtered titles.
    """
    initial_state: dict = {
        "messages": [],
        "user_message": user_message,
        "session_id": session_id,
        "genres": [],
        "mood": "",
        "similar_to": [],
        "seed_ips": [],
        "raw_retrieved_docs": [],
        "anime_results": [],
        "filtered_titles": [],
        "search_limit": 5,
        "iteration": 0,
        "max_iterations": 3,
        "http_client": http_client,
    }

    result = await agent.ainvoke(initial_state)

    # Extract the last AI message from the state
    messages = result.get("messages", [])
    response_text = "I apologize, but I was unable to generate a recommendation. Please try again with a different request."
    for msg in reversed(messages):
        if hasattr(msg, "content") and msg.type == "ai":
            response_text = msg.content
            break

    return {
        "response": response_text,
        "seed_ips": result.get("seed_ips", []),
        "filtered_titles": result.get("filtered_titles", []),
    }

"""JSON API routes for chat and health endpoints."""

import asyncio
import json
import logging
import uuid

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from app.agent.graph import agent
from app.config import settings
from app.models import ChatRequest, ErrorResponse, HealthResponse

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post(
    "/chat",
    responses={500: {"model": ErrorResponse}},
)
async def chat(request: Request, body: ChatRequest):
    """Process a chat message through the LangGraph agent pipeline and stream output."""
    session_id = body.session_id if body.session_id else str(uuid.uuid4())
    http_client = request.app.state.http_client

    initial_state = {
        "messages": [],
        "user_message": body.message,
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

    async def sse_generator():
        try:
            metadata_sent = False
            seed_ips = []
            filtered_titles = []
            
            async for event in agent.astream_events(initial_state, version="v2"):
                # Track node outputs to gather metadata
                if event["event"] == "on_chain_end":
                    output = event.get("data", {}).get("output", {})
                    if isinstance(output, dict):
                        if "seed_ips" in output:
                            seed_ips = output["seed_ips"]
                        if "filtered_titles" in output:
                            filtered_titles = output["filtered_titles"]

                # Check for streaming tokens from stream_llm chain
                if event["event"] == "on_chain_stream" and event["name"] == "stream_llm":
                    token = event["data"]["chunk"]
                    if token:
                        if not metadata_sent:
                            # Send metadata chunk first
                            meta_payload = {
                                "type": "metadata",
                                "session_id": session_id,
                                "seed_ips": seed_ips,
                                "filtered_titles": filtered_titles,
                            }
                            yield f"data: {json.dumps(meta_payload)}\n\n"
                            metadata_sent = True
                        
                        # Send token chunk
                        token_payload = {
                            "type": "token",
                            "text": token,
                        }
                        yield f"data: {json.dumps(token_payload)}\n\n"
                        
            # If the LLM response was empty or we never sent metadata
            if not metadata_sent:
                meta_payload = {
                    "type": "metadata",
                    "session_id": session_id,
                    "seed_ips": seed_ips,
                    "filtered_titles": filtered_titles,
                }
                yield f"data: {json.dumps(meta_payload)}\n\n"
                
        except Exception as e:
            logger.error(f"Error in SSE stream: {e}", exc_info=True)
            error_payload = {
                "type": "error",
                "detail": str(e)
            }
            yield f"data: {json.dumps(error_payload)}\n\n"

    return StreamingResponse(
        sse_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.get("/health", response_model=HealthResponse)
async def health():
    """Return service health status."""
    return HealthResponse(
        status="healthy",
        model=settings.openrouter_model,
    )

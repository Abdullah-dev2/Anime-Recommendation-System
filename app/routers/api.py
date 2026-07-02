"""JSON API routes for chat and health endpoints."""

import uuid

from fastapi import APIRouter, HTTPException, Request

from app.agent.graph import run_agent
from app.config import settings
from app.models import ChatRequest, ChatResponse, ErrorResponse, HealthResponse

router = APIRouter()


@router.post(
    "/chat",
    response_model=ChatResponse,
    responses={500: {"model": ErrorResponse}},
)
async def chat(request: Request, body: ChatRequest):
    """Process a chat message through the LangGraph agent pipeline."""
    session_id = body.session_id if body.session_id else str(uuid.uuid4())

    http_client = request.app.state.http_client

    try:
        result = await run_agent(
            user_message=body.message,
            session_id=session_id,
            http_client=http_client,
        )
        return ChatResponse(
            response=result,
            session_id=session_id,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Agent processing failed: {str(e)}",
        )


@router.get("/health", response_model=HealthResponse)
async def health():
    """Return service health status."""
    return HealthResponse(
        status="healthy",
        model=settings.openrouter_model,
    )

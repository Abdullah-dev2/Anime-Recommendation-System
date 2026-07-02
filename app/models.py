"""Pydantic request/response schemas for the API."""

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """Request body for POST /api/chat."""

    message: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="The user's chat message requesting anime recommendations.",
        examples=["I want something dark and psychological like Death Note"],
    )
    session_id: str = Field(
        default="",
        description="Optional session identifier. If empty, a new UUID is generated server-side.",
    )


class ChatResponse(BaseModel):
    """Response body for POST /api/chat."""

    response: str = Field(
        ...,
        description="The AI assistant's recommendation response in markdown format.",
    )
    session_id: str = Field(
        ...,
        description="The session identifier for this conversation.",
    )


class HealthResponse(BaseModel):
    """Response body for GET /api/health."""

    status: str = Field(
        default="healthy",
        description="Service health status.",
    )
    model: str = Field(
        ...,
        description="The configured OpenRouter model identifier.",
    )


class ErrorResponse(BaseModel):
    """Standard error response body."""

    detail: str = Field(
        ...,
        description="Human-readable error description.",
    )

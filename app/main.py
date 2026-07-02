"""FastAPI application entry point with CORS, lifespan, and router registration."""

from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routers import api, pages


@asynccontextmanager
async def lifespan(application: FastAPI):
    """Manage application lifespan: create and close shared HTTP client."""
    application.state.http_client = httpx.AsyncClient(timeout=30.0)
    yield
    await application.state.http_client.aclose()


app = FastAPI(
    title="Anime Recommendation System",
    description="AI-powered anime recommendation chatbot using LangGraph and OpenRouter.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files directory
app.mount("/static", StaticFiles(directory="static"), name="static")

# Mount React built assets
import os
react_assets_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist", "assets"))
os.makedirs(react_assets_dir, exist_ok=True)
app.mount("/assets", StaticFiles(directory=react_assets_dir), name="assets")

# Register routers
app.include_router(pages.router)
app.include_router(api.router, prefix="/api")

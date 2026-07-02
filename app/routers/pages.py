"""Jinja2-rendered HTML page routes."""

from fastapi import APIRouter, Request
from fastapi.templating import Jinja2Templates

router = APIRouter()
templates = Jinja2Templates(directory="templates")


@router.get("/")
async def index(request: Request):
    """Serve the main chat page."""
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={"title": "AniBot — Anime Recommendation Assistant"},
    )

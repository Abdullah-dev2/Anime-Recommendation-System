import os
from fastapi import APIRouter, Request
from fastapi.responses import FileResponse
from fastapi.templating import Jinja2Templates

router = APIRouter()
templates = Jinja2Templates(directory="templates")


@router.get("/")
async def index(request: Request):
    """Serve the main chat page (Vite React built page or fallback template)."""
    dist_index = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist", "index.html"))
    if os.path.exists(dist_index):
        return FileResponse(dist_index)
        
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={"title": "AniBot — Anime Recommendation Assistant"},
    )

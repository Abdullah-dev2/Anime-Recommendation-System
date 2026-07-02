---
title: AniBot - Anime Recommendation System
emoji: 🤖
colorFrom: purple
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# AniBot — AI Anime Recommendation System

[![Hugging Face Spaces](https://img.shields.io/badge/%F0%9F%A4%97%20Hugging%20Face-Spaces-blue)](https://huggingface.co/spaces/Orsted0/Anime-recommender)

AniBot is an AI-powered anime recommendation chatbot. Built with **FastAPI**, **LangGraph**, and **OpenRouter**, the system accepts natural-language requests (e.g., *"I want something dark and psychological like Death Note"*), extracts user preferences, queries MyAnimeList (Jikan API), and responds with formatted suggestions inside a dark-neon cyberpunk chat UI.

---

## 🚀 Key Features

*   **LangGraph Orchestration**: Uses a 3-node agent workflow (`extract_preferences ➔ fetch_recommendations ➔ generate_response`) to parse instructions, query data sources, and synthesize output.
*   **Dual LLM Execution**:
    1.  *Extraction Node*: Converts freeform text into structured JSON metadata (genres, mood, similar titles).
    2.  *Generation Node*: Converses using a helpful, highly knowledgeable "Otaku/Anime Expert" persona (**AniBot**).
*   **Hybrid Search Fallback**: Programmatic fallback to a local database (`mock_anime_data.json`) on Jikan API timeouts or rate limits to ensure offline capabilities.
*   **Modern Web UI**: A server-rendered Jinja2 UI styled with a responsive dark-neon theme, glassmorphic inputs, micro-animations, and a client-side Markdown-to-HTML parser.
*   **Production Ready**: Configured with CORS, shared client lifespan pools (`httpx.AsyncClient`), and standardized Pydantic request/response validations.

---

## 📁 Folder Structure

```
Anime-Recommendation-System/
├── app/
│   ├── agent/                  # LangGraph workflow, nodes, and state schemas
│   ├── routers/                # FastAPI HTML and JSON endpoint routers
│   ├── services/               # OpenRouter HTTP Client & Jikan API wrapper
│   ├── config.py               # Dotenv settings configuration
│   ├── models.py               # Pydantic validation models
│   └── main.py                 # FastAPI lifespans, CORS and entrypoint
├── templates/                  # Jinja2 base and layout templates
├── static/                     # Chat client JS, styling assets, and animations
├── mock_anime_data.json        # Offline fallback dataset
├── requirements.txt            # Pinned dependency listing
├── .env.example                # Sample environment keys
└── .gitignore                  # Git tracking rules
```

---

## ⚙️ Installation & Setup

### 1. Prerequisites
Ensure you have **Python 3.11+** installed on your system.

### 2. Clone the Repository & Navigate
```bash
git clone https://github.com/your-username/Anime-Recommendation-System.git
cd Anime-Recommendation-System
```

### 3. Create & Activate Virtual Environment

**Windows:**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

**macOS / Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 4. Install Pinned Dependencies
```bash
pip install -r requirements.txt
```

### 5. Configure Environment Variables
Copy the example environment template and add your OpenRouter API Key:
```bash
cp .env.example .env
```
Open `.env` and configure:
```env
OPENROUTER_API_KEY=sk-or-v1-your-key-here
OPENROUTER_MODEL=openai/gpt-4o-mini
```

---

## 🖥️ Running the Application

Start the FastAPI application via `uvicorn`:
```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Once running, navigate to:
*   **Live Demo (Hugging Face Spaces)**: [https://huggingface.co/spaces/Orsted0/Anime-recommender](https://huggingface.co/spaces/Orsted0/Anime-recommender)
*   **Web Application (Local)**: [http://localhost:8000](http://localhost:8000)
*   **Swagger API Documentation (Local)**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 📡 API Spec Summary

### `GET /`
Serves the responsive Jinja2 HTML chat interface.

### `GET /api/health`
Returns server operational health status.
*   **Response (`200 OK`)**:
    ```json
    {
      "status": "healthy",
      "model": "openai/gpt-4o-mini"
    }
    ```

### `POST /api/chat`
Submits user input, executes the agent, and returns recommendations.
*   **Payload**:
    ```json
    {
      "message": "I want something dark and psychological like Death Note",
      "session_id": ""
    }
    ```
*   **Response (`200 OK`)**:
    ```json
    {
      "response": "# Recommendations:\n- **Monster** (Score: 8.89/10)...",
      "session_id": "a9b2c3d4-e5f6-7890-abcd-ef1234567890"
    }
    ```

---

## 🛡️ License
This project is open-source and available under the [MIT License](LICENSE).
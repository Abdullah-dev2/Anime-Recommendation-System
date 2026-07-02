# ==========================================
# Stage 1: Build the React frontend
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Copy package files first for caching
COPY frontend/package*.json ./
RUN npm ci

# Copy the rest of the frontend source
COPY frontend/ ./
# Run Vite build to generate frontend/dist
RUN npm run build

# ==========================================
# Stage 2: Setup the Python environment
# ==========================================
FROM python:3.11-slim

# Avoid writing .pyc files to disk and buffering stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Create a non-root user with UID 1000 for Hugging Face Spaces compatibility
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

# Copy dependency files and install them to user's local path
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Copy built frontend assets from the builder stage
COPY --chown=user --from=frontend-builder /app/frontend/dist ./frontend/dist

# Copy the backend code and other application files
COPY --chown=user app/ ./app
COPY --chown=user templates/ ./templates
COPY --chown=user static/ ./static
COPY --chown=user mock_anime_data.json .

# Expose the default Hugging Face Spaces port
EXPOSE 7860

# Start the FastAPI application via uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]

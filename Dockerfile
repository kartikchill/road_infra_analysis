# ---------- Build Frontend ----------
FROM node:18 AS frontend
WORKDIR /frontend
COPY frontend/ .
RUN npm install
RUN npm run build

# ---------- Backend + Frontend Serve ----------
FROM python:3.10-slim
WORKDIR /app

# Install Python dependencies (light ones)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install heavy ML deps
RUN pip install --no-cache-dir ultralytics opencv-python-headless torch torchvision torchaudio

# Copy backend
COPY backend/ ./backend/

# Copy built frontend into backend/static
RUN mkdir -p backend/static
COPY --from=frontend /frontend/dist/ ./backend/static/

# Expose port
EXPOSE 8000

# Run FastAPI
CMD ["uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "8000"]

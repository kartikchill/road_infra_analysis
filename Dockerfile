# ---------------------------
# 1. Base Python image
# ---------------------------
FROM python:3.10-slim

# Prevent Python from buffering stdout
ENV PYTHONUNBUFFERED=1

# Set working directory
WORKDIR /app

# ---------------------------
# 2. Install system packages
# ---------------------------
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# ---------------------------
# 3. Copy backend
# ---------------------------
COPY backend/ backend/
COPY app.py app.py
COPY requirements.txt requirements.txt

# ---------------------------
# 4. Install Python packages
# ---------------------------
RUN pip install --no-cache-dir -r requirements.txt

# ---------------------------
# 5. Copy frontend
# ---------------------------
COPY frontend/ frontend/

# Build frontend (Vite)
RUN cd frontend && npm install && npm run build

# ---------------------------
# 6. Expose port
# ---------------------------
EXPOSE 8000

# ---------------------------
# 7. Start FastAPI + serve frontend
# ---------------------------
CMD ["python", "app.py"]

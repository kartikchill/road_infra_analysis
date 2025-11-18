##############################################
# 1) Build Frontend
##############################################
FROM node:20-slim AS frontend

WORKDIR /frontend
COPY frontend/ ./

RUN npm install --legacy-peer-deps
RUN npm run build


##############################################
# 2) Backend + Serve Frontend
##############################################
FROM python:3.10-slim AS backend

# Disable Python cache → reduces image size
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install ONLY needed backend deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Create static folder
RUN mkdir -p backend/static

# Copy built frontend output
COPY --from=frontend /frontend/dist/ ./backend/static/

EXPOSE 8000

CMD ["uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "8000"]

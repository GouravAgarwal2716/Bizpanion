
# Backend Dockerfile for Bizpanion prototype
FROM node:18-alpine AS build
WORKDIR /app
COPY backend/package*.json ./backend/
RUN apk add --no-cache python3 py3-pip build-base
# Install backend deps
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --production
# Copy rest of app
WORKDIR /app
COPY . .
# Install python dependencies for rag service
WORKDIR /app/backend
RUN pip3 install --no-cache-dir -r requirements.txt
# Expose ports
EXPOSE 5000 5001
CMD ["sh", "-c", "node backend/server.js & python3 backend/rag_service.py"]

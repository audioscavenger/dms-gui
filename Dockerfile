# Multi-stage build for Docker Mailserver GUI
# Stage 1: Build frontend
FROM node:18-alpine as frontend-builder

WORKDIR /app/frontend

# Copy frontend package.json and install dependencies
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend code and build
COPY frontend/ ./
RUN npm run build

# Stage 2: Build backend
FROM node:18-alpine as backend-builder

WORKDIR /app/backend

# Copy backend package.json and install dependencies
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy backend code
COPY backend/ ./

# Install Docker client inside the container for Docker API access
RUN apk add --no-cache docker-cli

# Stage 3: Final image with Nginx and Node.js
FROM node:18-alpine

# Install Nginx and Docker client
RUN apk add --no-cache nginx docker-cli

# Create app directories
WORKDIR /app
RUN mkdir -p /app/backend /app/frontend /run/nginx

# Copy backend from backend-builder
COPY --from=backend-builder /app/backend /app/backend

# Copy frontend build from frontend-builder
COPY --from=frontend-builder /app/frontend/dist /app/frontend

# Copy Nginx configuration
COPY docker/nginx.conf /etc/nginx/http.d/default.conf

# Copy startup script
COPY docker/start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Expose port for the application
EXPOSE 80

# Start Nginx and Node.js
CMD ["/app/start.sh"]
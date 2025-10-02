# Multi-stage build for Docker Mailserver GUI
#   docker rm dms-gui dms-gui-dms-gui; docker image prune -f
#   alias buildup='docker-compose up --build --force-recreate'
#   docker buildx build --no-cache -t audioscavenger/dms-gui:latest -t audioscavenger/dms-gui:1.0.6 .
#   docker push audioscavenger/dms-gui --all-tags

# Stage 1: Build frontend https://hub.docker.com/_/node
# https://dev.to/ptuladhar3/avoid-using-bloated-nodejs-docker-image-in-production-3doc
# FROM node:24-alpine AS frontend-builder
FROM node:slim AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package.json and install dependencies
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend code and build
COPY frontend/ ./
RUN npm run build
# RUN npm audit fix

# Stage 2: Build backend
# FROM node:24-alpine AS backend-builder
FROM node:slim AS backend-builder

WORKDIR /app/backend

# Copy backend package.json and install dependencies
COPY backend/package*.json ./
# RUN npm ci --only=production    # https://stackoverflow.com/questions/74599681/npm-warn-config-only-use-omit-dev
RUN npm ci --omit=dev
# RUN npm audit fix

# Copy backend code
COPY backend/ ./

# Install Docker client inside the container for Docker API access - nope, not needed
# RUN apk add --no-cache docker-cli

# Stage 3: Final image with Nginx and Node.js
FROM node:24-alpine
# FROM node:slim

# Install Nginx and Docker client - nope, what for? use a reverse proxy!
RUN apk add --no-cache nginx docker-cli

# Create app directories
WORKDIR /app
RUN mkdir -p /app/backend /app/frontend

# Copy project packages so we can get its version and pretty from within
COPY package*.json ./

# Copy backend from backend-builder
COPY --from=backend-builder /app/backend /app/backend

# Copy frontend build from frontend-builder
COPY --from=frontend-builder /app/frontend/dist /app/frontend

# Copy Nginx configuration - nope, what for? use a reverse proxy!
RUN mkdir -p /run/nginx
COPY docker/nginx.conf /etc/nginx/http.d/default.conf

# Copy startup script
COPY docker/start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Expose port for the application
EXPOSE 3001

# Start Nginx and Node.js OR just node
# CMD ["node", "/app/backend/index.js"]
CMD ["/app/start.sh"]

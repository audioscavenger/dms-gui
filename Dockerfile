# Multi-stage build for Docker Mailserver GUI
#   docker rm dms-gui dms-gui-dms-gui; docker image prune -f
#   alias buildup='docker-compose up --build --force-recreate'
#   docker buildx build --no-cache -t audioscavenger/dms-gui:latest -t audioscavenger/dms-gui:1.0.6 .
#   docker push audioscavenger/dms-gui --all-tags

# ARG DEBIAN_FRONTEND=noninteractive
# FROM debian:12-slim AS base
# # FROM debian:13-slim AS base

# # install nodejs
# RUN apt update

# # +127MB
# RUN apt -y install nodejs
# # + 932MB
# # RUN apt -y install npm
# # + 141MB
# RUN apt -y install npm procps --no-install-recommends

# RUN apt -y clean


# -----------------------------------------------------
# Stage 1: Build frontend https://hub.docker.com/_/node
# https://dev.to/ptuladhar3/avoid-using-bloated-nodejs-docker-image-in-production-3doc
FROM node:slim AS frontend-builder
# FROM base AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package.json and install dependencies
COPY frontend/package*.json ./

RUN npx npm-check-updates -u
RUN npm install

RUN npm ci

# Copy frontend code and build
COPY frontend/ ./
RUN npm run build
RUN npm audit fix

# -----------------------------------------------------
# Stage 2: Build backend
FROM node:slim AS backend-builder
# FROM base AS backend-builder

WORKDIR /app/backend

# Copy backend package.json and install dependencies
COPY backend/package*.json ./

RUN npx npm-check-updates -u
RUN npm install

# RUN npm ci --only=production    # https://stackoverflow.com/questions/74599681/npm-warn-config-only-use-omit-dev
RUN npm ci --omit=dev
RUN npm audit fix

# Copy backend code
COPY backend/ ./

# Install Docker client inside the container for Docker API access - nope, not needed
# RUN apk add --no-cache docker-cli

# -----------------------------------------------------
# Stage 3: Final image with Nginx and Node.js + python3
FROM node:24-alpine
# FROM base

# Install Python, needed for OctoDNS
# RUN apk add python3 py3-pip

# alpine Install Nginx and Docker client - what is docker-cli for?
# RUN apk add --no-cache docker-cli
RUN apk add --no-cache nginx
# RUN apk add --no-cache nginx python3 py3-pip  // nope we will add a separacte octoDNS container
# # debian Install Nginx and Docker client - what is docker-cli for?
# RUN apt -y install nginx python3 --no-install-recommends
# RUN apt -y clean

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

# nginx from alpine:
COPY docker/nginx.conf /etc/nginx/http.d/default.conf
# # nginx from debian:
# COPY docker/nginx.conf /etc/nginx/sites-available/default

# Copy startup script
COPY docker/start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Expose port for the application
EXPOSE 3001

# Start Nginx and Node.js OR just node itself when slim is used for main stage
# CMD ["node", "/app/backend/index.js"]
CMD ["/app/start.sh"]

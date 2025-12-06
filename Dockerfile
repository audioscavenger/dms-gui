# Multi-stage build for Docker Mailserver GUI
#   docker rm dms-gui dms-gui-dms-gui; docker image prune -f
#   alias buildup='docker-compose up --build --force-recreate'
#   docker buildx build --no-cache -t audioscavenger/dms-gui:latest -t audioscavenger/dms-gui:1.0.6 .
#   docker push audioscavenger/dms-gui --all-tags

# -----------------------------------------------------
# Stage 1: Build frontend https://hub.docker.com/_/node
# https://dev.to/ptuladhar3/avoid-using-bloated-nodejs-docker-image-in-production-3doc
# FROM node:slim AS frontend-builder
FROM node:24-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package.json and install dependencies
COPY frontend/package*.json ./
COPY common.*js* ../

# RUN npx npm-check-updates -u
# RUN npm install
# RUN npm audit fix
RUN npm ci

# Copy frontend code and build
COPY frontend/ ./
RUN npm run build

# -----------------------------------------------------
# Stage 2: Build backend
# FROM node:slim AS backend-builder
FROM node:24-alpine AS backend-builder

WORKDIR /app/backend

# Copy backend package.json and install dependencies
COPY backend/package*.json ./
COPY common.*js* ../

# RUN npx npm-check-updates -u
# RUN npm install
# RUN npm audit fix
# RUN npm ci --only=production    # https://stackoverflow.com/questions/74599681/npm-warn-config-only-use-omit-dev
RUN npm ci --omit=dev

# Copy backend code
COPY backend/ ./

# Install Docker client inside the container for Docker API access - nope, not needed
# RUN apk add --no-cache docker-cli

# -----------------------------------------------------
# Stage 3: Final image with Nginx and Node.js
FROM node:24-alpine

ARG DMSGUI_VERSION=1.5.13
ARG DMSGUI_DESCRIPTION="A graphical user interface for managing all aspects of DMS including: email accounts, aliases, xapian indexes, and DNS entries."

# alpine Install Nginx and Docker client - what is docker-cli for?
# RUN apk add --no-cache docker-cli
RUN apk add --no-cache nginx

# Create app directories
WORKDIR /app
RUN mkdir -p /app/backend /app/frontend
COPY common.*js* ./

# Copy project packages so we can get its version and pretty from within - nope we don't do that anymore
#COPY package*.json ./

# Copy backend from backend-builder
COPY --from=backend-builder /app/backend /app/backend

# Copy frontend build from frontend-builder
COPY --from=frontend-builder /app/frontend/dist /app/frontend

# this only detects changes in /backend and does not recompile the frontend. useless
# https://www.metered.ca/blog/how-to-restart-your-node-js-apps-automatically-with-nodemon/
# COPY nodemon.json ./
# RUN npm install -g nodemon

# Copy Nginx configuration - nope, what for? use a reverse proxy!
RUN mkdir -p /run/nginx

# nginx from alpine:
COPY docker/nginx.conf /etc/nginx/http.d/default.conf

# Copy startup script
COPY docker/start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Expose port for the application
# EXPOSE 3001

# Start Nginx and Node.js OR just node itself when slim is used for main stage
# CMD ["node", "/app/backend/index.js"]
CMD ["/app/start.sh"]


# Add metadata to image:
LABEL org.opencontainers.image.title="dms-gui"
LABEL org.opencontainers.image.vendor="audioscavenger"
LABEL org.opencontainers.image.authors="audioscavenger on GitHub"
LABEL org.opencontainers.image.licenses="AGPL-3.0-only"
LABEL org.opencontainers.image.description=${DMSGUI_DESCRIPTION}
LABEL org.opencontainers.image.url="https://github.com/audioscavenger/dms-gui"
LABEL org.opencontainers.image.documentation="https://github.com/audioscavenger/dms-gui/blob/master/README.md"
LABEL org.opencontainers.image.source="https://github.com/docker-mailserver/docker-mailserver"
# ARG invalidates cache when it is used by a layer (implicitly affects RUN)
# Thus to maximize cache, keep these lines last:
LABEL org.opencontainers.image.revision=${DMSGUI_VERSION}
LABEL org.opencontainers.image.version=${DMSGUI_VERSION}
ENV DMSGUI_VERSION=${DMSGUI_VERSION}
ENV DMSGUI_DESCRIPTION=${DMSGUI_DESCRIPTION}
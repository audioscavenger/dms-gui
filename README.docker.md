# Docker Mailserver GUI - Detailed Docker Setup

This document provides detailed instructions for deploying and managing the [Docker Mailserver](https://github.com/docker-mailserver/docker-mailserver) GUI using Docker.

## Prerequisites

- Docker Engine (version 19.03.0+)
- Running docker-mailserver container
- Docker socket access (/var/run/docker.sock)
- Docker Compose (version 1.27.0+ - only if using Option 2)

## Common Configuration

### Environment Variables

Both deployment options use the same environment variables:

- `DMS_CONTAINER`: Name of your docker-mailserver container (required)
- `PORT_NODEJS`: Internal port for the Node.js server (*3001)
- `DEBUG`: Node.js environment: (*production or development)
- `NODE_ENV`: Node.js environment: (*production or development)
- `SETUP_SCRIPT`: the internal path the docker-mailserver setup script: normally `/usr/local/bin/setup`

### Deployment Options

You can deploy Docker Mailserver GUI in two ways:

1. **Option 1: Using pre-built Docker Hub image** - Easiest method, no build required
2. **Option 2: Building locally with Docker Compose** - For customization or development

Each option is detailed in the sections below.

## Project Structure

```
dms-gui/
├── backend/               # Backend API
├── frontend/              # Frontend React app
├── docker/                # Docker configuration files
│   ├── nginx.conf         # Nginx configuration
│   └── start.sh           # Container startup script
├── Dockerfile             # Docker image configuration
├── docker-compose.yml     # Docker Compose configuration
└── README.docker.md       # Docker setup documentation
```

## Option 1: Using Docker Hub Image

The application is available as a pre-built Docker image on Docker Hub:

```bash
docker run -d \
  --name dms-gui \
  -p 80:80 \
  -e DMS_CONTAINER=dms \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  audioscavenger/dms-gui:latest
```

Where:
- `dms` is the name of your docker-mailserver container
- Port 80 is mapped to your host

For more information about the Docker Hub image, visit:
https://hub.docker.com/r/audioscavenger/dms-gui

## Option 2: Building Locally with Docker Compose

### Configuration

Before building the application, adjust the `docker-compose.yml` file to match your docker-mailserver setup:

1. Update the `DMS_CONTAINER` environment variable to match your docker-mailserver container name

Example:
```yaml
environment:
  - DMS_CONTAINER=mail-server  # Your docker-mailserver container name
```

That's it! Since we're using Docker API via the socket, no network configuration is needed. The application will communicate with docker-mailserver through the Docker daemon on the host.

### Building and Running

To build and start the application:

```bash
docker-compose up -d
```

This will:
1. Build the Docker image that includes both frontend and backend
2. Start the container in detached mode
3. Map port 80 for the web interface

## Accessing the Application

Once the container is running, you can access the web interface at:

```
http://localhost
```

## Stopping the Application

To stop the application:

```bash
docker-compose down
```

## Logs

To view logs from the container:

```bash
docker-compose logs -f mailserver-gui
```

## Updating

To update the application after making changes:

```bash
docker-compose down
docker-compose build
docker-compose up -d
```

## How It Works

The Docker setup uses a multi-stage build process:
1. First stage builds the React frontend
2. Second stage prepares the Node.js backend
3. Final stage combines both into a single image with Nginx and Docker client

When the container starts:
1. The backend Node.js server runs on port 3001 inside the container
2. Nginx serves the frontend static files
3. Nginx proxies API requests (/api/*) to the Node.js backend
4. The backend communicates with your docker-mailserver container via Docker API

The application uses Docker API directly (via the dockerode library) to:
1. Execute commands in the docker-mailserver container
2. Check the container status and resource usage
3. All operations are performed through the Docker socket (/var/run/docker.sock)

Unlike a traditional approach where containers need to be on the same network to communicate, using the Docker API through the socket means:
1. The application talks to the Docker daemon on the host
2. The Docker daemon then communicates with the docker-mailserver container
3. No direct network connection between containers is needed
4. This simplifies configuration and deployment

## Troubleshooting

### Connection to docker-mailserver fails

- Ensure the docker-mailserver container is running
- Check that the container name matches the `DMS_CONTAINER` environment variable
- Check that the `/var/run/docker.sock` volume is correctly mounted
- Verify that your host user has permissions to access the Docker socket

### API errors

- Check the container logs: `docker-compose logs mailserver-gui`
- Verify that the Nginx configuration correctly proxies to the backend
- Ensure the backend can start properly

### Docker API connection issues

- Check that the Docker socket is correctly mounted in the container
- Ensure your user has permissions to access the Docker socket
- Verify that the Docker client is installed in the container

## Security Considerations

- The container has access to the Docker socket, which is a security risk. Make sure to restrict access to the container.
- Consider setting up HTTPS for production deployments (you can modify the nginx.conf)
- Add authentication to the web interface for production use


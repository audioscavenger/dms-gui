# Docker Mailserver GUI

A graphical user interface for managing [Docker Mailserver](https://github.com/docker-mailserver/docker-mailserver). The application allows easy management of email accounts, aliases, and monitoring of server status.

[![Docker Pulls](https://img.shields.io/docker/pulls/audioscavenger/dms-gui)](https://hub.docker.com/r/audioscavenger/dms-gui)

## Features

- 📊 Dashboard with server status information
- 👤 Email account management (add, delete)
- ↔️ Email alias management
- 🔧 Docker Mailserver connection configuration
- 🌐 Multilingual support (English, Polish)

## Quick Start

```bash
docker run -d \
  --name mailserver-gui \
  -p 80:80 \
  -e DMS_CONTAINER=mailserver \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  audioscavenger/dms-gui:latest
```

The application will be available at http://localhost

## Configuration

### Environment Variables

- `DMS_CONTAINER`: Name of your docker-mailserver container (required)
- `PORT`: Internal port for the Node.js server (defaults to 3001)
- `NODE_ENV`: Node.js environment (defaults to production)

### Prerequisites

- Running docker-mailserver container
- Docker socket access

## How It Works

The Docker image includes:
- React frontend served by Nginx
- Node.js backend API
- Docker client for communicating with docker-mailserver

When the container starts:
1. The backend Node.js server runs on port 3001 inside the container
2. Nginx serves the frontend static files
3. Nginx proxies API requests (/api/*) to the Node.js backend
4. The backend communicates with your docker-mailserver container via Docker API

## Troubleshooting

### Connection to docker-mailserver fails

- Ensure the docker-mailserver container is running
- Check that the container name matches the `DMS_CONTAINER` environment variable
- Check that the `/var/run/docker.sock` volume is correctly mounted
- Verify that your host user has permissions to access the Docker socket

### Docker API connection issues

- Check that the Docker socket is correctly mounted in the container
- Ensure your user has permissions to access the Docker socket

## Security Considerations

- The container has access to the Docker socket, which is a security risk. Make sure to restrict access to the container.
- Consider setting up HTTPS for production deployments
- Add authentication to the web interface for production use

## License

MIT

## Links

- [GitHub Repository](https://github.com/audioscavenger/dms-gui)
- [Bug Reports](https://github.com/audioscavenger/dms-gui/issues)
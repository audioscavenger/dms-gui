# Docker Mailserver GUI
[![Docker Pulls](https://img.shields.io/docker/pulls/audioscavenger/dms-gui)](https://hub.docker.com/r/audioscavenger/dms-gui)

A graphical user interface for managing [Docker Mailserver](https://github.com/docker-mailserver/docker-mailserver). The application allows easy management of email accounts, aliases, and monitoring of server status. Forked from [docker-mailserver-gui](https://github.com/dunaj-dev/docker-mailserver-gui)

## Features

- 📊 Dashboard with server status information
- 👤 Email account management (add, delete)
- ↔️ Email alias management
- 🔧 Docker Mailserver connection configuration
- 🌐 Multilingual support (English, Polish)

![Dashboard](/assets/dms-gui-Dashboard.webp)
![Accounts](/assets/dms-gui-Accounts.webp)
![Aliases](/assets/dms-gui-Aliases.webp)

## Requirements

- Node.js (v24)
- npm
- [Docker Mailserver](https://docker-mailserver.github.io/docker-mailserver/latest/) (installed and configured)

## Project Structure

The application consists of two parts:

- **Backend**: Node.js/Express API for communicating with Docker Mailserver
- **Frontend**: React user interface with i18n support

## Installation

You have nothing to install, this is an all-included docker service for your DMS compose, that provides a UI for DMS.

If you want to develop/pull requests and test, see README.docker.md and each README under the subfolders `backend` and `frontend`.

## Configuration

After the first launch, go to the "Settings" tab and configure:

1. Path to the `setup.sh` script from Docker Mailserver
2. Docker Mailserver container name

## Language Support

The application supports multiple languages throught i18n.js:

- English
- Polish

Languages can be switched using the language selector in the top navigation bar.

## Docker Deployment

There are two ways to deploy using Docker:

### Option 1: Docker Compose with dms + proxy (Recommended)

Sample extract from `docker-compose.yml`, rename `dms` to the actual name of your docket-Mailserver container!
```yaml
---
services:
  dms:
    <your dms compose here>
    ...
    networks:
      frontend:
  
  gui:
    container_name: dms-gui
    hostname: dms-gui
    image: audioscavenger/dms-gui:latest
    restart: unless-stopped
    depends_on:
      - dms
    
    # use either ones: env_file or the environment section:
    env_file: ./dms-gui/backend/.env
    
    environment:
      TZ: ${TZ}
      PORT_NODEJS: 3001
      DMS_CONTAINER: dms
      DEBUG: false

    expose:
      - 80
    
    volumes:
      - /etc/timezone:/etc/timezone:ro
      - /etc/localtime:/etc/localtime:ro
      
      - /var/run/docker.sock:/var/run/docker.sock:ro
    
    networks:
      frontend:

# use the network of your choice
networks:
  frontend:
    external: true
    name: frontend
```

**Note:** Replace `dms` with the name of your docker-mailserver container.
**Note:** Replace `frontend` with the name of the external network your proxy also uses

### Option 2: Manual using the pre-built image from Docker Hub

```bash
docker run -d \
  --name dms-gui \
  -p 80:80 \
  -e DMS_CONTAINER=dms \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  audioscavenger/dms-gui:latest
```

**Note:** Replace `dms` with the name of your docker-mailserver container.

### Environment Variables

- `DMS_CONTAINER`: Name of your docker-mailserver container (required)
- `PORT_NODEJS`: Internal port for the Node.js server (*3001)
- `DEBUG`: Node.js environment: (*production or development)
- `NODE_ENV`: Node.js environment: (*production or development)
- `SETUP_SCRIPT`: the internal path the docker-mailserver setup script: normally `/usr/local/bin/setup`

### Docker Features

- Single container with both frontend and backend
- Nginx serves the React frontend and proxies API requests with http
- Communication with docker-mailserver via Docker API
- Minimal configuration (just set the container name)

For detailed Docker setup instructions, please refer to:
- [README.docker.md](README.docker.md) - Detailed Docker setup guide
- [README.dockerhub.md](README.dockerhub.md) - Docker Hub specific information

## Code Formatting

This project uses [Prettier](https://prettier.io/) for consistent code formatting. Configuration is defined in the root `.prettierrc.json` file.

### Automatic Formatting

Formatting is automatically applied to staged files before each commit using [Husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/okonet/lint-staged). This ensures that all committed code adheres to the defined style guide.

### Manual Formatting

You can also manually format the code using the npm scripts available in both the `backend` and `frontend` directories:

```bash
# Navigate to the respective directory (backend or frontend)
cd backend # or cd frontend

# Format all relevant files
npm run format

# Check if all relevant files are formatted correctly
npm run format:check
```

## Development

### Backend

```bash
cd backend
npm install
```
Configure the `.env` file with the appropriate [#environment-variables], using `.env.example`

### Frontend

```bash
cd frontend
npm install
```

## Running the Application

### Backend

```bash
cd backend
npm run dev
```

### Frontend

```bash
cd frontend
npm start
```

After running both parts, the application will be available at http://localhost:3000

## License

MIT

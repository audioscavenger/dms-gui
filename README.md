# Docker Mailserver GUI
[![Docker Pulls](https://img.shields.io/docker/pulls/audioscavenger/dms-gui)](https://hub.docker.com/r/audioscavenger/dms-gui)

A graphical user interface for managing DMS ([Docker-Mailserver](https://github.com/docker-mailserver/docker-mailserver)). This portal aims to manage all aspects of DMS including email accounts, aliases, UI settings, indexes, etc.

Warning: no authentication security has been added yet! Anyone with access to your docker network and knowledge of the api calls can do anything!

## Features

- 📊 Dashboard with server status information
- 👤 Email account management (add, delete)
- ↔️ Email alias management
- 🔧 Docker-Mailserver connection configuration
- 🌐 Multilingual support (English, Polish)

<!-- ![Dashboard](https://github.com/audioscavenger/dms-gui/blob/main/assets/dms-gui-Accounts.webp?raw=true) -->
![Dashboard](/assets/dms-gui-Dashboard.webp)
![Accounts](/assets/dms-gui-Accounts.webp)
![Aliases](/assets/dms-gui-Aliases.webp)
![Settings](/assets/dms-gui-Settings.webp)

## Requirements

- Node.js (node:slim)
- npm
- [Docker-Mailserver](https://docker-mailserver.github.io/docker-mailserver/latest/) (installed and configured)

## Project Structure

The application consists of two parts:

- **Backend**: Node.js/Express API for communicating with Docker-Mailserver
- **Frontend**: React user interface with i18n support

## Installation

You have nothing to install, this is an all-included docker service for your MS compose, that provides a UI for DMS.

If you want to develop/pull requests and test, see README.docker.md and each README under the subfolders `backend` and `frontend`.

## Configuration

Copy `./config/.dms-gui.env.example` to `./config/.dms-gui.env` and update with your own environment:

```
# Server port
PORT_NODEJS=3001
REACT_APP_API_URL=http://localhost:${PORT_NODEJS}
DB_PATH=/app/config

# Docker Mailserver Configuration
SETUP_SCRIPT=/usr/local/bin/setup
DMS_CONTAINER=dms

# Debugging
# Set to true to enable debug logs for Docker commands
#DEBUG=true

# Environment
# NODE_ENV=development
NODE_ENV=production
```

## Language Support

The application supports multiple languages throught i18n.js:

- English
- Polish

Languages can be switched using the language selector in the top navigation bar.

## Docker Deployment

There are two ways to deploy using Docker:

### Option 1: Docker Compose with dms + proxy (Recommended)

#### Compose for dms + dms-gui
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
    env_file: ./config/.dms-gui.env
    
    environment:
      - TZ=${TZ}
      
      # Server port
      - PORT_NODEJS=3001
      - REACT_APP_API_URL=http://localhost:${PORT_NODEJS}
      - DB_PATH=/app/config

      # Docker Mailserver Configuration
      - SETUP_SCRIPT=/usr/local/bin/setup
      - DMS_CONTAINER=dms

      # Debugging
      # Set to true to enable debug logs for Docker commands
      # - DEBUG=true

      # Environment
      # - NODE_ENV=development
      - NODE_ENV=production

    expose:
      - 80    # frontend
      - 3001  # /docs
    
    volumes:
      - /etc/timezone:/etc/timezone:ro
      - /etc/localtime:/etc/localtime:ro
      - ./config/:/app/config/
      
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

#### Reverse proxy

We recommend this reverse proxy for its simplicity: [swag](https://docs.linuxserver.io/general/swag/).

Sample proxy configuration:

```nginx
server {
    listen 443 ssl;
   listen 443 quic;
    listen [::]:443 ssl;
   listen [::]:443 quic;
  
  server_name dms.*;

  location /docs {

    # enable the next two lines for http auth
    auth_basic "Restricted";
    auth_basic_user_file /config/nginx/.htpasswd;

    include /config/nginx/proxy.conf;
    include /config/nginx/resolver.conf;

    set $upstream_app dms-gui;
    set $upstream_port 3001;
    set $upstream_proto http;
    proxy_pass $upstream_proto://$upstream_app:$upstream_port;

  }

  location / {

    # enable the next two lines for http auth
    auth_basic "Restricted";
    auth_basic_user_file /config/nginx/.htpasswd;

    include /config/nginx/proxy.conf;
    include /config/nginx/resolver.conf;

    set $upstream_app dms-gui;
    set $upstream_port 80;
    set $upstream_proto http;
    proxy_pass $upstream_proto://$upstream_app:$upstream_port;

  }

}
```

As stated above, no security is in place yet. You must as a form of authentication at the proxy level.


### Option 2: Manual using the pre-built image from Docker Hub

```bash
docker run -d \
  --name dms-gui \
  -p 80:80 \
  -p 3001:3001 \
  -e DMS_CONTAINER=dms \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -v /etc/timezone:/etc/timezone:ro \
  -v /etc/localtime:/etc/localtime:ro \
  -v./config/:/app/config/ \
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
- Communication with docker-mailserver via Docker API
- Minimal configuration (just set the container name)
- optional Nginx to serve the React frontend and proxies API requests with http, disabled in Dockerfile

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
Configure the `./config/.dms-gui.env` file with the appropriate [#environment-variables], using `./config/.dms-gui.env.example`

### Frontend

```bash
cd frontend
npm install
```

After running both parts, the application will be available at http://localhost:3000

## License

AGPL-3.0-only

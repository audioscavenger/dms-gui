# Docker Mailserver GUI
[![Docker Pulls](https://img.shields.io/docker/pulls/audioscavenger/dms-gui)](https://hub.docker.com/r/audioscavenger/dms-gui)

A graphical user interface for managing DMS ([Docker-Mailserver](https://github.com/docker-mailserver/docker-mailserver)). This portal aims to manage all aspects of DMS including email accounts, aliases, xapian indexes, and DNS entries.

Warning: The whole thing relies on mounting `/var/run/docker.sock` so it can run commands on the DMS container. Don't trust me and look at the code. `Caddy` will be implemented in the future to plug this "risk".

## Features

- 🔐 Login page, crypto-secure hashed passwords
- 📊 Dashboard with server status information
- 👤 Email account management (add, delete)
- ↔️ Email alias management
- 🔧 Docker-Mailserver connection configuration
- 🛢️ better-sqlite3 database!
- 🌐 Multilingual support (English, Polish)
- 👌 Cutting edge Node.JS v24

![Dashboard](https://github.com/audioscavenger/dms-gui/blob/main/assets/dms-gui-Accounts.webp?raw=true)
<!-- ![Dashboard](/assets/dms-gui-Login.webp)
![Dashboard](/assets/dms-gui-Dashboard.webp)
![Accounts](/assets/dms-gui-Accounts.webp)
![Aliases](/assets/dms-gui-Aliases.webp)
![Settings](/assets/dms-gui-Settings.webp) -->

## Requirements

- Node.js (v18+)
- npm and dozens of packages
- [Docker-Mailserver](https://docker-mailserver.github.io/docker-mailserver/latest/) (installed and configured)

## Project Structure

The application consists of two parts:

- **Backend**: Node.js/Express API for communicating with Docker-Mailserver
- **Frontend**: React user interface with i18n support

## Installation

You have nothing to install, this is an all-included docker image that provides a GUI for DMS.

If you want to develop/pull requests and test, see README.docker.md and each README under the subfolders `backend` and `frontend`.

## Configuration

`./config/` will host dms-gui.sqlite3 and its environment config file.

Rename `./config/.dms-gui.env.example` as `./config/.dms-gui.env` and update for your own environment:

```
# Docker Mailserver Configuration
SETUP_SCRIPT=/usr/local/bin/setup
DMS_CONTAINER=dms

# backend port
PORT_NODEJS=3001

# Debugging
# DEBUG=true

# Dev Environment
REACT_APP_API_URL=http://localhost:${PORT_NODEJS}
CONFIG_PATH=/app/config
# NODE_ENV=development
NODE_ENV=production
```

### Environment Variables

- `DMS_CONTAINER`: Name of your docker-mailserver container (required)

- `SETUP_SCRIPT`: The internal path to docker-mailserver setup script: normally `/usr/local/bin/setup`
- `DEBUG`: Node.js environment: (*production or development)

The ones you should never alter unless you want to develop:

- `PORT_NODEJS`: Internal port for the Node.js server (*3001)
- `NODE_ENV`: Node.js environment: (*production or development)
- `REACT_APP_API_URL`: defaults to `http://localhost:3001`
- `CONFIG_PATH`= defaults to `/app/config`


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
      - TZ=${TZ:-UTC}
      
      # Docker Mailserver Configuration
      - SETUP_SCRIPT=/usr/local/bin/setup
      - DMS_CONTAINER=dms

      # backend port
      - PORT_NODEJS=3001

      # Debugging
      # - DEBUG=true

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

  # swagger API docs
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

    # enable the next two lines for http auth (use you own)
    # auth_basic "Restricted";
    # auth_basic_user_file /config/nginx/.htpasswd;

    include /config/nginx/proxy.conf;
    include /config/nginx/resolver.conf;

    set $upstream_app dms-gui;
    set $upstream_port 80;
    set $upstream_proto http;
    proxy_pass $upstream_proto://$upstream_app:$upstream_port;

  }

}
```

You can and _should_ add a form of authentication at the proxy level, unless you totally trust React AuthContext and its implementation.


### Option 2: Manual using the pre-built image from Docker Hub

```bash
docker run -d \
  --name dms-gui \
  -p 127.0.0.1:80:80 \
  -p 127.0.0.1:3001:3001 \
  -e DMS_CONTAINER=dms \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -v /etc/timezone:/etc/timezone:ro \
  -v /etc/localtime:/etc/localtime:ro \
  -v./config/:/app/config/ \
  audioscavenger/dms-gui:latest
```

**Note:** Replace `dms` with the name of your docker-mailserver container.

## Docker Features

- Single container with both frontend and backend
- Communication with docker-mailserver via Docker API
- Minimal configuration (just set the container name)
- optional Nginx to serve the React frontend and proxies API requests with http, disabled in Dockerfile

For detailed Docker setup instructions, please refer to:
- [README.docker.md](README.docker.md) - Detailed Docker setup guide
- [README.dockerhub.md](README.dockerhub.md) - Docker Hub specific information

## Available endpoints

- `GET /api/status` - Server status
- `GET /api/infos` - Server environment
- `GET /api/settings` - Get settings
- `POST /api/settings` - Save settings
- `GET /api/logins` - Get admin credentials
- `POST /api/logins` - Save admin credentials
- `POST /api/loginUser` - login user true/false

- `GET /api/accounts` - List email accounts [?refresh=true]
- `POST /api/accounts` - Add a new account
- `DELETE /api/accounts/:email` - Delete an account
- `DELETE /api/accounts/:email/password` - Update account password
- `GET /api/aliases` - List aliases [?refresh=true]
- `POST /api/aliases` - Add a new alias
- `DELETE /api/aliases/:source/:destination` - Delete an alias


### Swagger API docs

OAS description of all API endpoints is available at:
* using compose + proxy: http://localhost/docs or https://dms.domain.com/docs (with proxy)
* using raw ports: http://localhost:3001/

![API](https://github.com/audioscavenger/dms-gui/blob/main/assets/dms-gui-docs.webp?raw=true)
<!-- ![API](/assets/dms-gui-docs.webp) -->


### API call Example:

```shell
curl -sSL https://dms.domain.com/api/status
```

Result:

```json
{
  "status": {
    "status": "running",
    "Error": "",
    "StartedAt": "2025-10-18T02:51:51.111429788Z",
    "FinishedAt": "0001-01-01T00:00:00Z",
    "Health": "healthy"
  },
  "resources": {
    "cpuUsage": 0.0051578073089701,
    "memoryUsage": 200925184,
    "diskUsage": "N/A"
  }
}```


## Behind the Scenes

Absolutely unnecessary, but this project uses [Prettier](https://prettier.io/) for consistent code formatting. Configuration is defined in the root `.prettierrc.json` file.

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
npx npm-check-updates -u
npm install
npm audit fix
```

### Frontend

```bash
cd frontend
npx npm-check-updates -u
npm install
npm audit fix
```

After running both parts, the application will be available at http://localhost:3001

## License

AGPL-3.0-only

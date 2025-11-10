# Docker Mailserver GUI
[![Docker Pulls](https://img.shields.io/docker/pulls/audioscavenger/dms-gui)](https://hub.docker.com/r/audioscavenger/dms-gui)

A graphical user interface for managing DMS ([Docker-Mailserver](https://github.com/docker-mailserver/docker-mailserver)). This portal aims to manage all aspects of DMS including email accounts, aliases, xapian indexes, and DNS entries.

## Features

- 🔐 Login page, crypto-secure hashed passwords
- 📊 Dashboard with server status information
- 👤 User management with roles for their mailboxes
- 📬 Mailbox account management
- 📧 Email alias management (includes regex)
- 🔧 Docker-Mailserver connection configuration
- 🛢️ better-sqlite3 database!
- 🌐 Multilingual support (English, Polish)
- 👌 Cutting edge Node.JS v24

How does dms-gui interact with DMS? Simply, by executing system commands in DMS through a python API that you mount and start within DMS. You don't need to alter `user-patches.sh` at all. Access security is handled with an API key that is generated from dms-gui itself.

### Login page

As long as the default admin user (_admin_ / password=_changeme_) exist, you are greeted with this message:

![Login](/assets/dms-gui-Login.webp)

### Profile page

There you can change your dms-gui / DMS Dovecot password. Users managers of multiple mailboxes cannot change individual mailboxes yet.

![Login](/assets/dms-gui-Profile.webp)

### Logins Management

Logins are 3 types:

| type | perks | details |
| -----|-------|---------|
| admins | Administrator | Can even demote itself |
| users | Can manage multiple mailboxes | Not admin, cannot change managed mailboxes, Authentication by dms-gui |
| linked users | Can change their mailbox password | Authentication provided by DMS Dovecot |

![Logins](/assets/dms-gui-Logins-new-user.webp)

Mailbox selection list comes from DMS directly. Password will be saved in both dms-gui and Dovecot in DMS, but Authentication for linked mailbox users is provided by DMS.

![Logins](/assets/dms-gui-Logins-new-linkbox.webp)

Mailbox users are automatically created, based off the scan of DMS dovecot server. The mechanic does not check if mailboxes have been deleted, it only pulls the current list and update the local db.

![Logins](/assets/dms-gui-Logins-auto.webp)

### Accounts

Also called "_emails_", as per the DMS setup command to create new email boxes, I prefer calling them _mailboxes_. They are _Accounts_, that can receive/store/send emails.

Accounts are automatically discovered and pulled from the local database for its speed. You can refresh the data manually with a simple click.

Creating accounts from here currently calls the DMS `setup` via `docker.sock`, but soon will rely on dovecot 2.4 API calls instead. Passwords entered are also stored in the local db.

![Accounts](/assets/dms-gui-Accounts.webp)

### Aliases

Currently relying on DMS `setup` and a direct read of the `postfix-regexp.cf`file. Soon ported to an API call.

![Aliases](/assets/dms-gui-Aliases.webp)

### Settings

Multiple sections to save UI settings, DMS API access, and show some internals + DMS environment values.

![Settings](/assets/dms-gui-Settings.webp)

dms-gui internals come from Node environment, and DMS values come from a mox of the `env` command and parsing dkim and dovecot configuration.

Some environment values like FTS (Full Text Search) will enable some options on the _Accounts_ page (`reindex` for instance).

![Settings](/assets/dms-gui-ServerInfos.webp)

### Dashboard

A dumb dashboard, but now you can click the cards and navigate to the section selected.

![Dashboard](/assets/dms-gui-Dashboard.webp)

## Requirements

- [Docker-Mailserver](https://docker-mailserver.github.io/docker-mailserver/latest/) (installed and configured)
- dms-gui definition in DMS compose, will extra port, volumes, and environment variables in DMS section

## Project Structure

- Node.js (v24 is embedded)
- npm and a dozen of modules

The application consists of two parts:

- **Backend**: Node.js/Express API for communicating with Docker-Mailserver
- **Frontend**: React user interface with i18n support

## Installation

You have nothing to install, this is an all-included docker image that provides a GUI for DMS.

If you want to develop/pull requests and test, see README.docker.md and each README under the subfolders `backend` and `frontend`.

## Configuration

`./config/dms-gui/` will host dms-gui.sqlite3 and its environment config file. This is a subfolder of the DMS `config` repository, for convenience; use any folder you want and update all the mounting points accordingly.

Rename `./config/dms-gui/.dms-gui.env.example` as `./config/dms-gui/.dms-gui.env` and update for your own environment:

```
## Docker-Mailserver Configuration
DMS_CONTAINER=dms
DMS_SETUP_SCRIPT=/usr/local/bin/setup

## DMS_API_KEY must be defined as env variable in your DMS compose
## You can set it up here as well, or let dms-gui generate its own; value generated in dms-gui takes precedence over this one
## DMS_API_KEY format is that of a uuid
# DMS_API_KEY=uuid

# Change the port in the same variable in DMS compose as needed
# DMS_API_PORT=8888

## Optional: Dev Environment
# PORT_NODEJS=3001
# API_URL=http://localhost:3001
# NODE_ENV=development
NODE_ENV=production

## Debugging
# DEBUG=true
```

### Environment Variables

All is optional, as they will be superseeded by the ones defined and saved within dms-gui:

- `DMS_CONTAINER`: Name of your docker-mailserver container (required)
- `DMS_SETUP_SCRIPT`: The internal path to docker-mailserver setup script: normally `/usr/local/bin/setup`
- `DEBUG`: Node.js environment: (*production or development)
- `DMS_API_KEY`: format is that of a uuid, must be defined in DMS environment too
- `DMS_API_PORT`: must be exposed in DMS compose too, defaults to 8888

The ones you should never alter unless you want to develop:

- `PORT_NODEJS`: Internal port for the Node.js server (*3001)
- `API_URL`: defaults to `http://localhost:3001`
- `NODE_ENV`: Node.js environment: (*production or development)


## Language Support

The application supports multiple languages throught i18n.js:

- English
- Polish

Languages can be switched using the language selector in the top navigation bar.

## Docker Deployment

There are two ways to deploy using Docker:

### Option 1: Docker Compose with dms + proxy (Recommended)

#### Compose for dms + dms-gui
Sample extract from `docker-compose.yml`, rename `dms` to the actual name of your docker-Mailserver container!
```yaml
---
services:
  dms:
    <your dms compose here>
    ...
    environment:
      DMS_API_KEY: adc71d05-f777-4f18-95b4-41da9432fe64 # key generated by you or dms-gui
      DMS_API_PORT: 8888    # optional
      PYTHONUNBUFFERED: 1   # enable api logging
    expose:
      - "8888"      # local python proxy API    <-- for dms-gui
    volumes:
      # enable dms-gui API: those files will be generated AFTER you enable the API within dms-gui
      - ./config/dms-gui/user-patches-api.conf:/etc/supervisor/conf.d/user-patches-api.conf:ro
      - ./config/dms-gui/user-patches-api.py:/tmp/docker-mailserver/dms-gui/user-patches-api.py:ro
      
    networks:
      frontend:     # same network as dms-gui
  
  gui:
    container_name: dms-gui
    hostname: dms-gui
    image: audioscavenger/dms-gui:latest
    restart: unless-stopped
    depends_on:
      - dms
    
    # use either ones: env_file or the environment section:
    env_file: ./config/dms-gui/.dms-gui.env
    
    environment:
      - TZ=${TZ:-UTC}
      
      # Debugging
      # - DEBUG=true

    expose:
      - 80    # frontend
      - 3001  # /docs
    
    volumes:
      - /etc/timezone:/etc/timezone:ro
      - /etc/localtime:/etc/localtime:ro
      - ./config/dms-gui/:/app/config/
      
    networks:
      frontend:

# use the network of your choice but DMS and dms-gui have to use the same
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

You can and _should_ add a form of authentication at the proxy level, unless you totally trust React AuthContext and its implementation (which I don't).


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
  -v./config/dms-gui/:/app/config/ \
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

<!--
![API](https://github.com/audioscavenger/dms-gui/blob/main/assets/dms-gui-docs.webp?raw=true)
-->
![API](/assets/dms-gui-docs.webp)


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
}
```


## Behind the Scenes

### Logging

Formatted logging with colors, that actually helps!
![Logins](/assets/dms-gui-logs.webp)

### Automatic Formatting

Absolutely unnecessary, but this project uses [Prettier](https://prettier.io/) for consistent code formatting. Configuration is defined in the root `.prettierrc.json` file.

Formatting was automatically applied to staged files before each commit using [Husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/okonet/lint-staged). This ensured that all committed code adheres to the defined style guide.

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

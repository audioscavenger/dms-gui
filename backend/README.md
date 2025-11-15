# Backend GUI for Docker Mailserver

This is the heart of this project: backend + API. It receives calls with [express](https://www.npmjs.com/package/express) and caries system commands on the DMS container via `/var/run/docker.sock`.

This is frowned upon for obvious security reasons. The alternative is to add a [Caddy](https://github.com/lucaslorentz/caddy-docker-proxy) api once DMS permits it, or maybe I will add the injection method one day. Don't trust some random dev project and read the code before trying on production data.

## Installation

```bash
npm install
```

## Running the server

Development:
```bash
npm run dev
```

Production:
```bash
npm start
```

## Configuration

Configure the `.dms-gui.env` file with the appropriate environment variables:

```
## Docker-Mailserver Configuration: all is handled byREact.
## React is incompatible with environment set variables
## Only the defaults used in dms-gui will be mentionned here.
## Don't set those variables as they will not be read
## DMS_CONTAINER=dms
## DMS_SETUP_SCRIPT=/usr/local/bin/setup
## DMS_API_KEY=uuid set in dms-gui
## DMS_API_PORT=8888

## Optional: Dev Environment
# PORT_NODEJS=3001
# API_URL=http://localhost:3001
# NODE_ENV=development
NODE_ENV=production

## Debugging
DEBUG=true

## JWT_SECRET = secret for salting the cookies, regenerated during container start, inside the container
## JWT_SECRET cannot be defined anywhere else then during container start, and is secret as the name suggests
## how long before rotation of the secret: yet to be handled
ACCESS_TOKEN_EXPIRY=1h

## utility paths for internal database
DMSGUI_CONFIG_PATH=/app/config
DATABASE=${DMSGUI_CONFIG_PATH}/dms-gui.sqlite3

## possible and lots of new calls available with dovecot 2.4, but will likely never be used
# DOVEADM_PORT=8080
```

## Project Structure

It's a very small size and classic React structure. Most has been factored but some other Forms could be refactored. Just follow the structure, it's fairly easy to grasp and with tools like [VScodium](https://vscodium.com/), it's even easier to handle.

```
dms-gui/
├── backend/                    # Backend API
│   ├── env.js                  # Environment variables
│   ├── backend.js              # backend functions
│   ├── index.js                # /api server
│   ├── db.js                   # better-sqlite3 database functions
│   └── *.js                    # One module per menu item
├── frontend/                   # Frontend React app
│   ├── public                  # favicon and index template
│   ├── frontend.js             # frontend functions
│   └── src                     # Frontend sources build in step 1 & 2
│       ├── components          # Classic React factored components
│       ├── hooks               # Authentication hooks for Login page
│       ├── locales             # Language packs for i18n
│       ├── pages               # the left menu items
│       └── services            # The frontend API calls to the backend API
├── docker/                     # Docker configuration files
│   ├── nginx.conf              # Nginx configuration
│   └── start.sh                # Container startup script
├── config/dms-gui/             # Local config and database
│   ├── .dms-gui.env            # Your environment variables
│   └── dms-gui.sqlite3         # As its name suggests
├── Dockerfile                  # Docker image configuration
├── docker-compose.yml          # Docker Compose configuration
└── README.md                   # Docker setup documentation
```

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

The parsing of queries is done with [qs](https://www.npmjs.com/package/qs), a querystring parsing and stringifying library with some added security.

### API docs

OAS description of all API endpoints is available at https://dms.domain.com/docs


### API call Example:

```shell
curl -sSL https://dms.domain.com/api/status
```

Result:

```json
{
  "status": {
    "status": "running",
    "error": "",
  },
  "resources": {
    "cpuUsage": 0.0051578073089701,
    "memoryUsage": 200925184,
    "diskUsage": "N/A"
  }
}
```


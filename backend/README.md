# Backend GUI for Docker Mailserver

This is a backend API for the [Docker Mailserver](https://github.com/docker-mailserver/docker-mailserver) user interface, enabling management of email accounts, aliases, and other mail server functions.

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

Configure the `.env` file with the appropriate environment variables:

```
PORT_NODEJS=3001
SETUP_SCRIPT=/usr/local/bin/setup
```

## Available endpoints

- `GET /api/logins` - Get admin credentials
- `POST /api/logins` - Save admin credentials
- `GET /api/settings` - Get settings
- `POST /api/settings` - Save settings
- `GET /api/status` - Server status
- `GET /api/accounts` - List email accounts [?refresh=true]
- `POST /api/accounts` - Add a new account
- `DELETE /api/accounts/:email` - Delete an account
- `GET /api/aliases` - List aliases [?refresh=true]
- `POST /api/aliases` - Add a new alias
- `DELETE /api/aliases/:source/:destination` - Delete an alias


### API docs

OAS description of all API endpoints is available at https://dms.domain.com/docs


### API call Example:

```shell
curl -sSL https://dms.domain.com/api/status
```

Result:

```json
{"status":"running","name":"dms-gui-backend","version":"1.0.6.3","resources":{"cpu":"3.22%","memory":"138.93MB","disk":"N/A"}}
```

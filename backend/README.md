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
PORT=3001
SETUP_SCRIPT=/usr/local/bin/setup
```

## Available endpoints

- `GET /api/status` - Server status
- `GET /api/accounts` - List of email accounts
- `POST /api/accounts` - Add a new account
- `DELETE /api/accounts/:email` - Delete an account
- `GET /api/aliases` - List of aliases
- `POST /api/aliases` - Add a new alias
- `DELETE /api/aliases/:source/:destination` - Delete an alias

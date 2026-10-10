# DMS-GUI — project map & agent rules

## What this is
React app that manages users and mailboxes for Docker Mailserver.
Node ESM backend + React frontend (webpack), Dockerized.

## Project structure
- `common.mjs` — shared functions used by BOTH backend and frontend
- `backend/` — Node ESM backend
  - `backend.mjs` — core backend functions
  - `accounts.mjs` / `aliases.mjs` / `logins.mjs` / `settings.mjs` — feature modules
  - `db.mjs` — better-sqlite3 database layer
  - `env.mjs` — env var handling
  - `index.js` — listeners / server startup (the only `.js` here)
  - `topParser.mjs` — parses Linux `top` command output
- `frontend/` — React app
  - `public/` — favicon + index template
  - `src/` — sources; routes live in `App.jsx`
    - `components/` React Components
    - `hooks/` Authentication, local storage, toasts
    - `locales/` i18n language packs
    - `pages/` — page components
    - `services/api.mjs` — frontend API routes
  - `src/frontend.mjs` — frontend functions
  - `src/i18n.mjs` — i18n setup
- `docker/` — `nginx.conf` (Nginx) + `start.sh` (container startup)
- `config/dms-gui/` — live config: `.dms-gui.env` (env vars) + `dms-gui.sqlite3`
- `Dockerfile` — image config; **line 6 holds the current version** (`ARG DMSGUI_VERSION=x.y.z`)

## Imports & navigation
Frontend/backend imports use **relative paths** — resolve them against the importing
file's directory. File map is above; you usually will not need to search for a file.

## Conventions (always apply)
- **Changelog**: After any behavior-changing edit (bug fix / feature / refactor,
  one or more files changed; NOT cosmetic or comment-only), and only AFTER the change
  has been applied successfully, add exactly ONE line to the top of the
  `## Impending changes` section in `CONTRIBUTING.md`.
  - Get the version from line 6 of `Dockerfile` only (read that single line, not the
    file). Read `CONTRIBUTING.md` only up to ~line 200; never edit past it.
  - Format: `* [ ] <version> - terse one-line description (with file name(s))`
  - One record per task, not one per change. Do not touch the Dockerfile.
- **Preserve comments**: never remove, shorten, or move any existing comment
  (JSDoc, inline, TODO, or commented-out code). Keep them when showing edited blocks.
- **No em/en dash**: never write `—` (U+2014) or `–` (U+2013) into files or comments;
  use a plain hyphen `-` or a colon. Copy existing text exactly when editing.
- **Code blocks**: when showing code, include language + file path in the info string,
  e.g.  ```javascript frontend/src/App.jsx
- **Mark agent edits**: when you modify code, add a `// Local Agent FIX:` comment
  (or matching `# Local Agent FIX:` / `/* */` form for the file type) marking the
  lines you added or changed, so the owner can distinguish agent changes from own edits.

## Build / run (mirror Docker container, do NOT drift!)

**Source of truth for the Node version: `Dockerfile` `FROM node:24.21.0-alpine3.24`.**
Before ANY local build, check `node -v` matches the Dockerfile image tag exactly.
If it differs, pin local Node first (see `.nvmrc`) - a version mismatch is a known
cause of "works locally, breaks in container".

Steps (same as Dockerfile stages):
```bat
cd frontend
npm ci                :: NOT npm install - must use the lockfile exactly
npm run lint          :: container lints before building
npm run production    :: webpack --mode production, outputs to frontend/dist
cd ..\backend
npm ci --omit=dev     :: better-sqlite3 compiles natively (alpine + g++ in docker)
```
Local dev (frontend only): `cd frontend & npm run start` (webpack-dev-server).

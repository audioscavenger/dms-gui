# Docker Mailserver GUI Development Guidelines

## Project Overview
- **Purpose:** GUI for managing Docker Mailserver (accounts, aliases, server status)
- **Architecture:** Single Docker container with frontend and backend
- **Technology Stack:** React frontend, Node.js/Express backend, Docker, Bootstrap

## Project Structure
- **Backend:** Express API communicating with Docker Mailserver via Docker API
- **Frontend:** React SPA with Bootstrap styling and i18n internationalization
- **Components:** Reusable UI components in `frontend/src/components`
- **Docker:** Single containerized application with Nginx and Node.js

## Project Commands
- **Local Development:**
  - Backend: `cd backend && npm run dev` - Start backend with hot-reload
  - Frontend: `cd frontend && npm start` - Start frontend dev server
  - Build: `cd frontend && npm run build` - Build frontend for production
- **Docker:**
  - Build and start: `docker-compose up -d`
  - Logs: `docker-compose logs -f mailserver-gui`
  - Rebuild: `docker-compose down && docker-compose build && docker-compose up -d`

## Code Style Guidelines
- **Imports:** Group imports by type (React, libraries, components, CSS)
- **Components:** Use functional components with React hooks
- **Naming:** PascalCase for components, camelCase for functions/variables
- **Code Structure:** Centralized API calls in services directory
- **Error Handling:** Use translation keys for error messages (not pre-translated strings)
- **Internationalization:** Use i18n translation keys for all user-facing text
- **Formatting:** 2 spaces indentation
- **Comments:** Use English for all comments

## UI Components
The project uses reusable components from `frontend/src/components`:
- **AlertMessage:** For error and success notifications
- **Button:** Standardized button component
- **Card:** Container with optional header
- **DashboardCard:** Special card for dashboard metrics
- **DataTable:** For tabular data display
- **FormField:** Text input field with validation
- **SelectField:** Dropdown select with validation
- **LoadingSpinner:** Loading indicator
- **Navbar & Sidebar:** Navigation components
- **LanguageSwitcher:** Language selector component

## Docker Implementation
- Single container with both frontend and backend
- Communication with docker-mailserver via Docker API (dockerode)
- Requires only Docker socket mount (`/var/run/docker.sock`)
- No direct network connection needed with docker-mailserver
- Nginx serves static frontend and proxies API requests to backend

## Backend API with Docker
The backend uses Docker API to:
- Execute commands in the docker-mailserver container
- Retrieve container status and statistics
- Manage email accounts and aliases

## Best Practices
- Maintain consistent error handling with translation keys
- Use reusable components for UI elements
- Handle loading/error states for all API requests
- Follow RESTful patterns for API endpoints
- Implement proper form validation

## Docker Hub Publication
- **Repository Category:** "Monitoring & Observability" (primary) or "Integrations & Delivery" (alternative)
- **Tags:** Use semantic versioning (e.g., v1.0.0, latest)
- **Description:** Include feature list, requirements, and setup instructions
- **Documentation:** Link to README.md and configuration examples
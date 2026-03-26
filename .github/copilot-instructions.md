# GitHub Copilot Workspace Instructions

## Project Overview
- Name: Internet Café Monitoring System
- Stack:
  - Backend: Laravel 11 (PHP)
  - Frontend: React 18 (Vite)
  - Client Agent: Node.js service executable for Windows
  - Database: MySQL/MariaDB with `database/schema.sql`
- Primary goal: LAN monitoring and remote control of café PCs via web dashboard + agent endpoints.

## Key Directories
- `backend/`: Laravel app (API routes, controllers, middleware, models, tests)
- `laravel-backend/`: source template / pre-migration project content
- `frontend/`: React dashboard app
- `client-agent/`: Windows client agent (Node.js, service installer, screenshots, heartbeat)
- `database/`: SQL schema

## Quick Local Dev Commands
- Full stack quick start: run `start_system.bat` at repo root; it installs deps and launches backend + frontend + agent helper flows.

### Backend
- `cd backend`
- `composer install`
- `cp .env.example .env` + update DB credentials and app keys
- `php artisan key:generate`
- `php artisan migrate --seed` (after schema import)
- `php artisan serve --host=0.0.0.0 --port=8000`
- Tests: `vendor/bin/phpunit` or `php artisan test`

### Frontend
- `cd frontend`
- `npm install`
- `npm run dev`

### Client Agent
- `cd client-agent`
- `npm install`
- `npm run install-service` (register Windows service) or
- `npm run uninstall-service`
- `build-agent.bat` to package an executable

## Architecture & conventions
- Agent PCs push status to API points (heartbeats, screenshot upload, get commands).
- Dashboard reads from Laravel API and database.
- `backend/routes/api.php` and `backend/routes/web.php` are authority for API endpoints.
- Model definitions in `backend/app/Models` (eg. `Pc.php`, `User.php`, `Command.php`, `ApiKey.php`).
- Avoid touching vendor code directly.

## When working in this workspace
- Prefer small, focused PRs: e.g., one endpoint, one model migration, one UI page.
- Preserve legacy migration path (`laravel-backend` -> `backend`) if you adjust onboarding scripts.
- Validate findings with `start_system.bat` (fast smoke test for integrated run).
- Environment secrets are in `backend/.env`; do not commit secrets.

## Testing and Validation
- Backend test files in `backend/tests/Feature` and `backend/tests/Unit`.
- Frontend can use `npm test` if set up (check `frontend/package.json`).
- Manual functional validation: run UI and agent on local network.

## Suggested prompt templates
1. "You are a backend Laravel engineer. In this repo, implement a new API route `POST /api/pc/{id}/reset` that creates a `Command` of type `reset`, stores it, and returns the updated PC status. Provide code and a test.`
2. "You are a frontend React engineer. In this repo, add a realtime status card in `frontend/src/components` that shows the number of online PCs from `GET /api/pcs/summary`. Provide component and API call.`
3. "You are an agent integration engineer. In this repo, add a `client-agent` service endpoint to POST system logs to `/api/logs` and wire backend storage in `backend/app/Models` and `api.php`."

## Recommended future customizations
- Add applyTo zones:
  - `backend/**` for PHP/Laravel commands
  - `frontend/**` for React/Tailwind/Vite work
  - `client-agent/**` for Node service packaging
- Add `AGENTS.md` for specialized roles: `backend`, `frontend`, `agent`, `qa`.
- Add `CONTRIBUTING.md` with database/seed/branch rules.

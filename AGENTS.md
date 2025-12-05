# Repository Guidelines

## Project Structure & Modules
- Root: repo scripts and shared config. Run `npm run dev` from the root to start both apps in dev.
- `backend/`: Express API with Prisma (PostgreSQL). Entry `src/server.js`; schema in `prisma/schema.prisma`; seed scripts in `backend/scripts/`.
- `frontend/`: React (Vite) + Chakra UI. Entry `src/App.jsx`; components under `src/components/`; API helpers in `src/api.js`.

## Build, Test, and Development Commands
- Backend: `cd backend && npm install` once. `npm run dev` starts the API at `http://localhost:4000`. `npm run prisma:push` syncs schema to the database.
- Frontend: `cd frontend && npm install` once. `npm run dev` starts Vite at `http://localhost:5173` (proxied to backend).
- Root: `npm install` (installs root helper). `npm run dev` runs backend + frontend concurrently.

## Coding Style & Naming Conventions
- JavaScript/JSX, 2-space indentation, single quotes in backend, double quotes acceptable in frontend as currently used.
- React components live in `frontend/src/components`; keep them small and presentational where possible.
- API helpers in `frontend/src/api.js` should return parsed JSON and set `credentials: 'include'`.
- Commit messages use short, imperative descriptions (e.g., “Fix nav path regex”).

## Testing Guidelines
- No formal test suite is present. When adding tests, colocate under `backend/tests` or `frontend/src/__tests__` and document the command to run them.
- For manual verification, run backend + frontend together and exercise trip creation, auth, and per-trip routes (`/trip/:id`).

## Commit & Pull Request Guidelines
- Prefer feature branches (`feature/...`). Keep commits focused; describe what changed and why.
- PRs: include a short summary, list of notable changes, and manual test notes (e.g., “Login/register flow, open trip, add activity”).
- If schema changes, note any Prisma commands run (`npx prisma db push`) and env vars required.

## Security & Configuration Tips
- Required env vars (backend): `DATABASE_URL`, `JWT_SECRET`. Keep secrets out of commits; use `.env` locally.
- Auth relies on JWT httpOnly cookies; frontend must send `credentials: 'include'`.
- Graceful shutdown is enabled; stop the server with SIGINT/SIGTERM rather than killing the process abruptly.

## Agent-Specific Notes
- Do not remove user data/branches. Respect viewer-mode guards in the UI when adding features.
- Keep routing consistent: trips list at `/`, trip pages under `/trip/:id` (with `/calendar`, `/places`, `/ideas` subroutes).

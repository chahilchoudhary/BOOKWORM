# Book Worm

Online bookstore: React SPA + Express REST API + PostgreSQL 16.
Requirements, architecture and task plan live in [`docs/`](docs/) (start with `00-READ-FIRST-BOB-RULES.md`).

Status: **T00 – repo scaffold only.** The API exposes `GET /api/health`; the frontend shows a placeholder page.

## Prerequisites

- Node.js **22.12 or newer** (LTS) and npm
- Docker with Compose (for PostgreSQL). The compose file pulls Red Hat images, so run `docker login registry.redhat.io` first.

## Run

```bash
# 1. install all three package.json files (root hooks, backend, frontend)
npm run setup

# 2. create local env files (git-ignored) from the examples
cp backend/.env.example backend/.env      # Windows: Copy-Item backend/.env.example backend/.env
cp frontend/.env.example frontend/.env    # Windows: Copy-Item frontend/.env.example frontend/.env

# 3. start PostgreSQL (5432) and the test PostgreSQL (5433)
docker compose up -d postgres postgres-test

# 4. start API (http://127.0.0.1:4000) and web app (http://127.0.0.1:5173)
npm run dev
```

Check it: `curl http://127.0.0.1:4000/api/health` returns `{"status":"ok"}`.

The backend validates its environment with zod in `backend/src/config/env.ts` and exits with a message listing every missing or invalid variable if `backend/.env` is absent or wrong.
Change `JWT_SECRET` (min 32 characters) in your local `.env`; never commit `.env`.

## Scripts

Run from the repo root (each runs in both packages) or with `npm --prefix backend|frontend run <script>`.

| Script              | What it does                          |
| ------------------- | ------------------------------------- |
| `npm run dev`       | API and web app together              |
| `npm run lint`      | ESLint (typescript-eslint), 0 warnings |
| `npm run typecheck` | `tsc --noEmit`, strict                |
| `npm test`          | Vitest (one run)                      |
| `npm run format`    | Prettier write                        |

Per package: `build` (backend: `tsc` to `dist/`; frontend: `tsc` + `vite build`).

A husky `pre-commit` hook runs lint-staged (ESLint + Prettier on staged files) and the type-check.

## Layout

```
backend/    Express 4 + TypeScript API (src/app.ts builds the app, src/server.ts listens)
frontend/   Vite + React 18 + TypeScript + Tailwind 3
docs/       requirements, architecture, task plan, wireframes
```

Full folder structure: `docs/02-ARCHITECTURE.md` §4.

## Databases

| Service         | Host port | Database        | Used for            |
| --------------- | --------- | --------------- | ------------------- |
| `postgres`      | 5432      | `bookworm`      | development         |
| `postgres-test` | 5433      | `bookworm_test` | automated tests     |

Both listen on `127.0.0.1` only. Default credentials (`bookworm` / `bookworm`) are for local development; override with `POSTGRES_USER`, `POSTGRES_PASSWORD` in a git-ignored root `.env`.

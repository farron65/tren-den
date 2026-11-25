# Tren Den 💪

Tren Den is a full-stack workout tracking web app that lets users log workouts and visualize exercise progress over time.

I didn't want to pay $5/month just to see my pretty progress graphs for my own 
gym data - so I built Tren Den, with progress charts and custom templates 
included for free. Let's go, LET'S GET JACKED 🦅

**Live demo:** https://trenden.netlify.app/

---

## What It Does

- User authentication with access & refresh tokens (JWT)
- Create and manage workouts
- Add exercises and sets (weight, reps)
- Relational data model:
  - `User → Workouts → Exercises → Sets`
- Automatic cascade deletes for nested entities
- Backend analytics API that returns historical exercise data
- Progress visualization using line charts
- Import workouts from Strong and Hevy by pasting the app's shared text, or through a Telegram bot (authenticated with an API key)

---

## Tech Stack

### Backend
- FastAPI (fully async)
- SQLModel models with async SQLAlchemy (`AsyncSession`) and `asyncpg`
- PostgreSQL
- Alembic (database migrations)
- Pydantic (data validation & schemas)
- JWT authentication, bcrypt password hashing

### Frontend
- React (Vite)
- Recharts
- Custom CSS (no UI framework)

### DevOps
- Docker (multi-stage builds)
- Docker Compose (backend, frontend, and local PostgreSQL)
- GitHub Actions CI (runs the test suite on every pull request)

---

## Performance

The backend was migrated from blocking database calls to async SQLAlchemy, and load-tested before and after (same machine, fresh database per run):

- **No more deadlock under load.** The old version froze completely at 50–100 concurrent users (FastAPI's thread pool and the database connection pool were waiting on each other). The async version kept serving ~170 reads/s at 100 users.
- **~10x login throughput.** Load testing showed bcrypt blocking the event loop, capping login at ~5 req/s. Running it in a thread pool raised that to ~54 req/s at 100 concurrent users.

Full results, methodology, and the scripts to rerun them: [`backend/loadtest/`](backend/loadtest/loadtest-results.txt)

---

## Current Status

- Deployed and in use
- Recently migrated to async and load-tested
- Maintained as needed

---

## Local Development

### Running with Docker

1. Clone the repository
2. Create `backend/.env` with the required variables (see `.env.example`)
    > Note: the frontend's API URL is set in `docker-compose.yml` under `args`
3. Run:
```bash
   docker compose up --build
```
   This starts the backend, frontend, and a local PostgreSQL database. Migrations run automatically on startup,
   so the database is ready to use - no manual setup needed.

4. Visit the app:
    - Frontend: http://localhost:8080
    - Backend: http://localhost:8000


### Running manually

#### Backend

1. Clone the repository
2. Create a PostgreSQL database
3. Set environment variables in `backend/.env` (see `.env.example`):
   - `DATABASE_URL` - PostgreSQL connection string. Must use the async driver: `postgresql+asyncpg://user:password@host:port/dbname`
   - `SECRET_KEY` - used to sign JWTs
   - `ACCESS_TOKEN_EXPIRE_MINUTES` - JWT expiration time
   - `ALGORITHM` - JWT signing algorithm (I'm using HS256)
   - `RESEND_EMAIL_API_KEY` - API key for sending emails
   - `CORS_ORIGINS` - comma-separated list of allowed frontend origins (e.g `http://localhost:5173,http://localhost:8080`)
   - `BOT_API_KEY` - shared secret the Telegram bot uses to call the import endpoint
   - `BOT_USERNAME` - the Tren Den user that bot imports are saved to
4. From `backend/`, apply migrations and start the server:
```bash
   pip install -r requirements.txt
   alembic upgrade head
   uvicorn main:app --reload
```

#### Frontend

1. Create an `.env.local` file inside `/frontend` (see `.env.example`)
2. Set environment variables:
   - `VITE_API_URL` - base URL of the FastAPI backend (e.g. `VITE_API_URL=http://localhost:8000`)
3. Run:
```bash
   npm install
   npm run dev
```

## Testing

The backend is tested with pytest, `pytest-asyncio`, and `httpx.AsyncClient`, against an in-memory SQLite database. GitHub Actions runs the suite on every pull request.

Tests cover:
- Auth endpoints (signup, login, token refresh, password reset)
- Users
- Workout CRUD
- Templates
- Exercise analytics (happy path, empty states, auth boundaries)
- Workout imports (Strong parser, bot API key)

To run tests, from `backend/`:
```bash
pytest
```

Load tests live in [`backend/loadtest/`](backend/loadtest/); see `run_version.sh` for usage.

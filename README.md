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

---

## Tech Stack

### Backend
- FastAPI
- SQLModel (ORM)
- PostgreSQL
- Pydantic (data validation & schemas)
- JWT authentication

### Frontend
- React (Vite)
- Recharts
- Custom CSS (no UI framework)

### DevOps
- Docker (multi-stage builds)
- Docker Compose (backend, frontend, and local PostgreSQL)

---

## Current Status

- Deployed and usable
- Feature-complete v1
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
3. Set environment variables (see `.env.example`):
   - `DATABASE_URL` - PostgreSQL connection string
   - `SECRET_KEY` - used to sign JWTs
   - `ACCESS_TOKEN_EXPIRE_MINUTES` - JWT expiration time
   - `ALGORITHM` - JWT signing algorithm (I'm using HS256)
   - `RESEND_EMAIL_API_KEY` - API key for sending emails
   - `CORS_ORIGINS` - comma-separated list of allowed frontend origins (e.g `http://localhost:5173,http://localhost:8080`)
4. Run:
```bash
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

Backend is tested using pytest and FastAPI's TestClient.

Tests cover:
- Auth endpoints (signup, login, token refresh, password reset)
- Users
- Workout CRUD
- Templates
- Exercise analytics (happy path, empty states, auth boundaries)

To run tests:
```bash
pytest 
```

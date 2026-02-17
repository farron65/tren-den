# Tren Den 🏋️‍♂️

Tren Den is a full-stack workout tracking web app that lets users log workouts and visualize exercise progress over time.

I built this project to design and ship my first complete full-stack application, and to address a common limitation in many workout apps, where progress charts and user created templates are restricted behind paywalls.

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
- Deployed frontend and backend

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

---

## Current Status

- Deployed and usable
- Feature-complete v1
- Maintained as needed 
---

## Local Development

### Backend

1. Clone the repository
2. Create a PostgreSQL database
3. Set environment variables:
   - `DATABASE_URL` - PostgreSQL connection string
   - `SECRET_KEY` - used to sign JWTs
   - `ACCESS_TOKEN_EXPIRE_MINUTES` - JWT expiration time
   - `ALGORITHM` - JWT signing algorithm (I'm using HS256)
   - `RESEND_EMAIL_API_KEY` - API key for sending emails
4. Run:
```bash
   uvicorn main:app --reload
```

### Frontend

1. Create an `.env.local` file inside /frontend
2. Set environment variables:
  - `VITE_API_URL` - base URL of the FastAPI backend (e.g. `VITE_API_URL=http://localhost:8000`)
5. Run:
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

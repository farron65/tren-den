# Tren Den 🏋️‍♂️

Tren Den is a full-stack workout tracking web app that lets users log workouts and visualize exercise progress over time.

I built this project to design and ship my first complete full-stack application, and to address a common limitation in many workout apps, where progress charts and user created templates are restricted behind paywalls.

**Live demo:** https://trenden.netlify.app/

---

## What It Does

- User authentication (JWT)
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
- Actively under development
- UI polish and bug fixes in progress

---

## Local Development

### Backend

1. Clone the repository
2. Create a PostgreSQL database
3. Set environment variables:
   - `DATABASE_URL`
   - `SECRET_KEY`
   - `ACCESS_TOKEN_EXPIRE_MINUTES`
   - `ALGORITHM`
4. Run:
```bash
   uvicorn main:app --reload
```

### Frontend

1. Create an `.env.local` file inside /frontend
2. Set the VITE_API_URL (e.g. `VITE_API_URL=http://localhost:8000`)
3. Run:
```bash
   npm install
   npm run dev
```

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import create_db_and_tables

from routers import users, auth, workouts, templates, analytics

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield
    
app = FastAPI(lifespan=lifespan)

origins = [
    "http://localhost:5173",
    "https://trenden.netlify.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/predict")
async def predict():
    return "Success"

app.include_router(users.router, prefix="", tags=["users"])
app.include_router(auth.router, prefix="", tags=["auth"])
app.include_router(workouts.router, prefix="/workouts", tags=["workouts"])
app.include_router(templates.router, prefix="/templates", tags=["templates"])
app.include_router(analytics.router, prefix="/exercises", tags=[""])
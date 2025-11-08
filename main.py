from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm

from sqlmodel import select
from datetime import timedelta

from typing import Annotated

from database import create_db_and_tables, SessionDep
from sqlmodel import Session

from models import Workout, Exercise, SetDetails, User

from schemas import WorkoutCreate, UserSignUp, Token, WorkoutResponse, UserRead, SetUpdate

from config import *
from auth import authenticate_user, hash_password, get_current_active_user, create_access_token

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield
    


app = FastAPI(lifespan=lifespan)


@app.get("/predict")
async def predict():
    return "Success"

@app.post("/signup", response_model=UserSignUp)
async def signup(user: UserSignUp, session: SessionDep):

    existing_user = session.exec(select(User).where(User.username == user.username)).first()
    
    if existing_user:
        raise HTTPException(409, "User already exists")
    else:
        user_password = hash_password(user.password)
        db_user = User(username=user.username, email = user.email, hashed_password=user_password)
    
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return user

@app.post("/login", response_model=Token)
async def login(session: SessionDep, form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(session, form_data.username, form_data.password)
    if not user:
        raise HTTPException(401, "Not authorized")
    
    
    access_token_expire = timedelta(minutes=15)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expire
    )
    return Token(access_token=access_token, token_type="bearer")


@app.post("/workout", response_model=WorkoutResponse)
async def post_workout(workout: WorkoutCreate, session: SessionDep, current_user = Depends(get_current_active_user)):
    
    db_workout = Workout(workout_name=workout.workout_name, date=workout.date, user=current_user)
    
    for exercise in workout.exercises:
        db_exercise = Exercise(exercise_name=exercise.exercise_name, workout=db_workout)
        
        for set in exercise.sets:
            db_set = SetDetails(weight=set.weight, reps=set.reps, exercise=db_exercise)
            
    session.add(db_workout)
    session.flush()
    session.commit()
    session.refresh(db_workout)
    return db_workout
    
@app.get("/users/me", response_model=UserRead)
async def read_users_me(current_user = Depends(get_current_active_user)):
    return current_user

@app.get("/users/me/workouts/")
async def get_own_workouts(current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    user_workouts = session.exec(select(Workout).where(Workout.user == current_user)).all()
        
    return user_workouts if user_workouts else "0 workouts have been done"

@app.get("/users/me/workouts/{id}", response_model=WorkoutResponse)
async def get_own_workout(id: int, current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    user_workout = session.exec(select(Workout).where(Workout.user == current_user).where(Workout.id == id)).first()
    if not user_workout:
        raise HTTPException(404, "Nonexistent")
    return user_workout 

@app.patch("/users/me/sets{set_id}", response_model=SetUpdate)
async def update_workout_set(set_id: int, updated_set: SetUpdate, current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    user_set = session.exec(select(SetDetails).where(SetDetails.id == set_id)).first()
    if not user_set:
        raise HTTPException(404, "Set doesn't exist")
    
    if user_set.exercise.workout.user_id != current_user.id: # type: ignore ---- typer checker is warning the "None" on workout.user_id
        raise HTTPException(401, "Not authorized")
    
    if updated_set.weight:
        user_set.weight = updated_set.weight
    if updated_set.reps:
        user_set.reps = updated_set.reps
        
    session.commit()
    return updated_set
    

@app.delete("/workouts/{workout_id}")
async def delete_workout(workout_id: int, current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    workout = session.exec(select(Workout).where(Workout.user == current_user).where(Workout.id == workout_id)).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    session.delete(workout)
    session.commit()
    return {"Success": True}

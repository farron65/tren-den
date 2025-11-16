from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm

from sqlmodel import select
from sqlalchemy import func

from datetime import timedelta, date

from typing import Annotated, Optional

from database import create_db_and_tables, SessionDep

from models import Workout, Exercise, SetDetails, User

from schemas import WorkoutCreate, UserSignUp, Token, WorkoutResponse, UserRead, SetUpdate, ExerciseUpdate, WorkoutUpdate, DeleteAccountRequest

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


@app.post("/workouts", response_model=WorkoutResponse)
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
    
@app.get("/me", response_model=UserRead)
async def read_users_me(current_user = Depends(get_current_active_user)):
    return current_user

@app.get("/workouts")
async def get_own_workouts(
    current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    workout_name: Optional[str] = None,
    exercise_name: Optional[str] = None
    ):
    query = select(Workout).where(Workout.user == current_user)
    
    if date_from and date_to and date_from > date_to:
        raise HTTPException(400, "date_from cannot be after date_to")
    if date_from:
        query = query.where(Workout.date >= date_from)
    if date_to:
        query = query.where(Workout.date <= date_to)
        
    if workout_name:
        query = query.where(func.lower(Workout.workout_name).contains(workout_name.lower()))
    if exercise_name:
        query = query.join(Exercise).where(func.lower(Exercise.exercise_name).contains(exercise_name.lower()))
    
    user_workouts = session.exec(query).all()
        
    return user_workouts if user_workouts else []

@app.get("/workouts/{id}", response_model=WorkoutResponse)
async def get_own_workout(id: int, current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    user_workout = session.exec(select(Workout).where(Workout.user == current_user).where(Workout.id == id)).first()
    if not user_workout:
        raise HTTPException(404, "Nonexistent")
    return user_workout 

@app.patch("/sets/{set_id}", response_model=SetUpdate)
async def update_workout_set(set_id: int, updated_set: SetUpdate, current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    
    if updated_set.weight is None and updated_set.reps is None:
        raise HTTPException(400, "Bad Request")
    
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

@app.patch("/exercise/{exercise_id}", response_model=ExerciseUpdate)
async def update_workout_exercise(exercise_id: int, updated_exercise: ExerciseUpdate, current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    
    if updated_exercise.exercise_name is None:
        raise HTTPException(400, "Bad Request")
    
    user_exercise = session.exec(select(Exercise).where(Exercise.id == exercise_id)).first()
    
    if not user_exercise:
        raise HTTPException(404, "Exercise doesn't exist")
    if user_exercise.workout.user_id != current_user.id: # type: ignore ---- typer checker is warning the "None" on workout.user_id 
        raise HTTPException(401, "Not authorized")
    
    if updated_exercise.exercise_name:
        user_exercise.exercise_name = updated_exercise.exercise_name
    
    session.commit()
    return updated_exercise

@app.patch("/workouts/{workout_id}", response_model=WorkoutUpdate)
async def update_workout(workout_id: int, updated_workout: WorkoutUpdate, current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    
    if updated_workout.workout_name is None and updated_workout.date is None:
        raise HTTPException(400, "Bad Request")
    
    user_workout = session.exec(select(Workout).where(Workout.id == workout_id)).first()
    
    if not user_workout:
        raise HTTPException(404, "Workout doesn't exist")
    if user_workout.user_id != current_user.id: # type: ignore ---- typer checker is warning the "None" on workout.user_id 
        raise HTTPException(401, "Not authorized")
    
    if updated_workout.workout_name:
        user_workout.workout_name = updated_workout.workout_name
    if updated_workout.date:
        user_workout.date = updated_workout.date
    
    session.commit()
    return updated_workout

@app.delete("/sets/{set_id}")
async def delete_set(set_id: int, current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    user_set = session.exec(select(SetDetails).where(SetDetails.id == set_id)).first()
    
    if not user_set:
        raise HTTPException(status_code=404, detail="Set not found")
    
    if user_set.exercise.workout.user_id != current_user.id: # type: ignore ---- typer checker is warning the "None" on workout.user_id 
        raise HTTPException(401, "Not authorized")

    session.delete(user_set)
    session.commit()
    return {"Success": True}

@app.delete("/exercises/{exercise_id}")
async def delete_exercise(exercise_id: int, current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    user_exercise = session.exec(select(Exercise).where(Exercise.id == exercise_id)).first()
    
    if not user_exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    
    if user_exercise.workout.user_id != current_user.id: # type: ignore ---- typer checker is warning the "None" on workout.user_id 
        raise HTTPException(401, "Not authorized")

    session.delete(user_exercise)
    session.commit()
    return {"Success": True}

@app.delete("/workouts/{workout_id}")
async def delete_workout(workout_id: int, current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    workout = session.exec(select(Workout).where(Workout.user == current_user).where(Workout.id == workout_id)).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    session.delete(workout)
    session.commit()
    return {"Success": True}

@app.delete("/delete/me")
async def delete_user(deletion_conf: DeleteAccountRequest, current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    user = authenticate_user(session, current_user.username, deletion_conf.password)
    if user:
        if deletion_conf.confirmation.lower() == "yes":
            session.delete(user)
            session.commit()
            return {"Success": True}
        
        raise HTTPException(400, "Bad Request")    
    raise HTTPException(401, "Invalid Credentials")
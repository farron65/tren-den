from fastapi import APIRouter, Depends, HTTPException, Form

from auth_utils import get_current_active_user

from sqlmodel import select
from sqlalchemy import func
from database import SessionDep

from datetime import date
from typing import Annotated, Optional

from models import User, Workout, Exercise, SetDetails
from schemas import WorkoutCreate, WorkoutResponse

from queries import get_user_workout

router = APIRouter()

@router.post("", response_model=WorkoutResponse)
async def post_workout(workout: WorkoutCreate, session: SessionDep, current_user = Depends(get_current_active_user)):
    
    db_workout = Workout(workout_name=workout.workout_name, date=workout.date, user=current_user)
    
    for exercise in workout.exercises:
        db_exercise = Exercise(exercise_name=exercise.exercise_name, rest_time=exercise.rest_time, workout=db_workout)
        
        for set in exercise.sets:
            db_set = SetDetails(weight=set.weight, reps=set.reps, exercise=db_exercise)
            
    session.add(db_workout)
    session.flush()
    session.commit()
    session.refresh(db_workout)
    return db_workout

@router.get("",response_model=list[WorkoutResponse])
async def get_user_workouts(
    current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    workout_name: Optional[str] = None,
    exercise_name: Optional[str] = None
    ):
    query = select(Workout).order_by(Workout.date.desc()).where(Workout.user == current_user) # type: ignore -- .order_by(Workout.date.desc()) type checker 😭
    
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
        
    return user_workouts

@router.get("/{workout_id}", response_model=WorkoutResponse)
async def get_own_workout(workout_id: int, current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    user_workout = session.exec(select(Workout).where(Workout.user == current_user).where(Workout.id == workout_id)).first()
    if not user_workout:
        raise HTTPException(404, "Nonexistent")
    return user_workout 

@router.put("/{workout_id}", response_model=WorkoutResponse)
async def update_workout(workout_id: int, updated_workout: WorkoutCreate, current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    user_workout = get_user_workout(workout_id, current_user, session)
    
    if (user_workout is None):
        raise HTTPException(404, "Not Found")
    
    user_workout.workout_name = updated_workout.workout_name
    user_workout.date = updated_workout.date
    
    for ex in user_workout.exercises:
        session.delete(ex)

    session.commit()
    
    for updated_ex in updated_workout.exercises:
        db_exercise = Exercise(exercise_name=updated_ex.exercise_name, workout=user_workout)
        
        for updated_set in updated_ex.sets:
            db_set = SetDetails(weight=updated_set.weight, reps=updated_set.reps, exercise=db_exercise)
            
        session.add(db_exercise)

    session.flush()
    session.commit()
    session.refresh(user_workout)
    
    return user_workout

@router.delete("/{workout_id}")
async def delete_workout(workout_id: int, current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    workout = session.exec(select(Workout).where(Workout.user == current_user).where(Workout.id == workout_id)).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    session.delete(workout)
    session.commit()
    return {"Success": True}


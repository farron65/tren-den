from fastapi import APIRouter, Depends, HTTPException

from sqlmodel import select, distinct
from sqlalchemy import func, desc, asc
from sqlalchemy.orm import selectinload

from typing import Annotated
from database import SessionDep
from models import User, Workout, Exercise, SetDetails

from auth_utils import get_current_active_user
from queries import get_exercise_sets, get_exercise_history, compare_previous_values

router = APIRouter()

@router.get("/")
async def search_exercises(exercise_name: str, current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    if not exercise_name:
        raise HTTPException(400, "Invalid Exercise Name")
    user_exercises = session.exec(select(Exercise.exercise_name, func.max(Workout.date)) # You can't order by the things you haven't 'select' -ed
                        .where(func.lower(Exercise.exercise_name).contains(exercise_name))
                        .join(Workout).where(Workout.user == current_user)
                        .order_by(desc(func.max(Workout.date))).group_by(Exercise.exercise_name)).all() # type: ignore

    return dict(user_exercises)

@router.get("/recent") 
async def get_recent_exercises(current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    user_exercises = session.exec(select(Exercise).join(Workout)
        .where(Workout.user == current_user)
        .options(selectinload(Exercise.sets)) # type: ignore
        .order_by(desc(Workout.date)).limit(25)).all() # type: ignore
    
    unique_ex_names = set()
    user_exercises_data = []
    
    if not user_exercises:
        return []

    for unique_ex in user_exercises:
        if unique_ex.exercise_name.lower() not in unique_ex_names:
            unique_ex_names.add(unique_ex.exercise_name.lower())
            temp = {"id": unique_ex.id, "exercise_name": unique_ex.exercise_name, "rest_time": unique_ex.rest_time, "sets": []}
            for ex_set in unique_ex.sets:
                temp["sets"].append({"id": ex_set.id, "weight": ex_set.weight, "reps": ex_set.reps})
            user_exercises_data.append(temp)
        
    return user_exercises_data

@router.get("/analytics/{exercise_name}")
async def get_exercise_analytics(exercise_name: str, current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):

    user_exercises = session.exec(select(Exercise).where(func.lower(Exercise.exercise_name) == exercise_name.lower())
        .join(Workout)
        .options(selectinload(Exercise.sets)).options(selectinload(Exercise.workout)) # type: ignore
        .where(Workout.user == current_user)
        .order_by(asc(Workout.date))).all() # type: ignore

    if not user_exercises:
        return []
    
    user_exercise_data = []
    for ex in range(len(user_exercises)):
        session_volume = 0 
        set_volume = 0
        heaviest_set = SetDetails(weight=0, reps=0)
        volume_change = 0
        if ex > 0: 
            volume_change = compare_previous_values(user_exercises[ex-1], user_exercises[ex])
        for ex_set in user_exercises[ex].sets:
            session_volume += ex_set.weight * ex_set.reps
            if ex_set.weight * ex_set.reps > set_volume:
                set_volume = ex_set.weight * ex_set.reps 
            if ex_set.weight > heaviest_set.weight:
                heaviest_set = ex_set
            elif ex_set.weight == heaviest_set.weight and ex_set.reps > heaviest_set.reps:
                heaviest_set = ex_set
        
        user_exercise_data.append({
                "date": user_exercises[ex].workout.date,
                "workout_name": user_exercises[ex].workout.workout_name,
                "session_volume": session_volume,
                "best_set_volume": set_volume,
                "weight": heaviest_set.weight,
                "reps": heaviest_set.reps, 
                "sets": [
                    { 
                        "weight": set.weight,
                        "reps": set.reps
                    }
                        for set in user_exercises[ex].sets
                    ],
                "volume_change": volume_change if ex > 0 else None
            })
    summary = get_exercise_history(exercise_name, current_user, session)
    
    return {
        "data": user_exercise_data,
        "summary": summary
    }

@router.get("/{exercise_name}")
async def get_exercise_data(exercise_name: str, current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    user_exercise_data = get_exercise_sets(exercise_name, current_user, session)
        
    return user_exercise_data   

# Static methods before dynamic, took me more than 20 mins to figure out why the fe was getting null, bruh

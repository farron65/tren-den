from fastapi import APIRouter, Depends

from sqlmodel import select
from sqlalchemy import func, desc, asc

from typing import Annotated

from database import SessionDep

from models import User, Workout, Exercise, SetDetails

# from config import 
from auth_utils import get_current_active_user
from queries import get_exercise_sets

import time

router = APIRouter()

@router.get("/analytics/{exercise_name}")
async def get_exercise_analytics(exercise_name: str, current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    start = time.time() 
    query_start = time.time()
    user_exercises = session.exec(select(Exercise).where(func.lower(Exercise.exercise_name) == exercise_name.lower()).join(Workout).where(Workout.user == current_user).order_by(asc(Workout.date))).all() # type: ignore
    print(f"Query took: {time.time() - query_start}s")
    print(f"Found {len(user_exercises)} exercises")

    if not user_exercises:
        return []
    
    process_start = time.time()
    user_exercise_data = []
        
    for exercise in user_exercises:
        print(f"Exercise has {len(exercise.sets)} sets")
        session_volume = 0 
        set_volume = 0
        heaviest_set = SetDetails(weight=0, reps=0)
        
        for ex_set in exercise.sets:
            session_volume += ex_set.weight * ex_set.reps
            if ex_set.weight * ex_set.reps > set_volume:
                set_volume = ex_set.weight * ex_set.reps 
            if ex_set.weight > heaviest_set.weight:
                heaviest_set = ex_set
            elif ex_set.weight == heaviest_set.weight and ex_set.reps > heaviest_set.reps:
                heaviest_set = ex_set
        
        user_exercise_data.append({
                "date": exercise.workout.date,
                "workout_name": exercise.workout.workout_name,
                "session_volume": session_volume,
                "best_set_volume": set_volume,
                "weight": heaviest_set.weight,
                "reps": heaviest_set.reps, 
                "sets": [
                    { 
                        "weight": set.weight,
                        "reps": set.reps
                    }
                        for set in exercise.sets
                    ]
            })
        
    print(f"Processing took: {time.time() - process_start}s")
    
    print(f"Total: {time.time() - start}s")
    
    return user_exercise_data

@router.get("/recent") 
async def get_recent_exercises(current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    user_exercises = session.exec(select(Exercise).join(Workout).where(Workout.user == current_user).order_by(desc(Workout.date)).limit(25)).all() # type: ignore
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

@router.get("/{exercise_name}")
async def get_exercise_data(exercise_name: str, current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    user_exercise_data = get_exercise_sets(exercise_name, current_user, session)
        
    return user_exercise_data   

# Static methods before dynamic, took me more than 20 mins to figure out why the fe was getting null, bruh

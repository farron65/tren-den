from models import User, Workout, Exercise
from sqlalchemy import func, desc
from sqlmodel import select
from fastapi import HTTPException, Depends
from typing import Annotated
from auth import get_current_active_user
from database import SessionDep

def get_exercise_sets(exercise_name: str, current_user: User, session: SessionDep):
    user_exercise = session.exec(select(Exercise).where(func.lower(Exercise.exercise_name) == exercise_name.lower()).join(Workout).where(Workout.user == current_user).order_by(desc(Workout.id))).first() # type: ignore
    
    if not user_exercise:
        raise HTTPException(404, "Not Found")
    user_exercise_data = {"id": user_exercise.id, "exercise_name": user_exercise.exercise_name, "sets": []}
    for set in user_exercise.sets:
        user_exercise_data["sets"].append({"id": set.id, "weight": set.weight, "reps": set.reps})

    return user_exercise_data 

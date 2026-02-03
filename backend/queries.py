from models import User, Workout, Exercise
from sqlalchemy import func, desc
from sqlmodel import select
from database import SessionDep

def get_exercise_sets(exercise_name: str, current_user: User, session: SessionDep):
    user_exercise = session.exec(select(Exercise).where(func.lower(Exercise.exercise_name) == exercise_name.lower()).join(Workout).where(Workout.user == current_user).order_by(desc(Workout.id))).first() # type: ignore
    
    if not user_exercise:
        return None
    user_exercise_data = {"id": user_exercise.id, "exercise_name": user_exercise.exercise_name, "rest_time": user_exercise.rest_time, "sets": []}
    
    for set in user_exercise.sets:
        user_exercise_data["sets"].append({"id": set.id, "weight": set.weight, "reps": set.reps, "rest_time": set.rest_time})

    return user_exercise_data 

def get_user_workout(workout_id: int, current_user: User, session: SessionDep) -> Workout | None:
    user_workout = session.exec(select(Workout).where(Workout.id == workout_id).where(Workout.user == current_user)).first()
    return user_workout if user_workout else None

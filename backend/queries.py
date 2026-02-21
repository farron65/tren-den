from sqlalchemy import func, desc
from sqlalchemy.orm import selectinload

from sqlmodel import select
from models import User, Workout, Exercise
from database import SessionDep

def get_exercise_sets(exercise_name: str, current_user: User, session: SessionDep):
    user_exercise = session.exec(select(Exercise).where(func.lower(Exercise.exercise_name) == exercise_name.lower())
        .join(Workout)
        .where(Workout.user == current_user)
        .order_by(desc(Workout.date))).first() # type: ignore

    if not user_exercise:
        return None
    user_exercise_data = {"id": user_exercise.id, "exercise_name": user_exercise.exercise_name, "rest_time": user_exercise.rest_time, "sets": []}
    
    for set in user_exercise.sets:
        user_exercise_data["sets"].append({"id": set.id, "weight": set.weight, "reps": set.reps, "rest_time": set.rest_time})

    return user_exercise_data 

def get_user_workout(workout_id: int, current_user: User, session: SessionDep) -> Workout | None:
    user_workout = session.exec(select(Workout).where(Workout.id == workout_id).where(Workout.user == current_user)).first()
    return user_workout if user_workout else None

def get_exercise_history(exercise_name: str, current_user: User, session: SessionDep):
    exercises_history = session.exec(select(Exercise).where(func.lower(Exercise.exercise_name) == exercise_name.lower())
        .join(Workout)
        # .options(selectinload(Exercise.sets)).options(selectinload(Exercise.workout))  #type: ignore
        .where(Workout.user == current_user)
        .order_by(desc(Workout.date))).all() # type: ignore
    current_volume = sum([s.weight * s.reps for s in exercises_history[0].sets])
    
    change_3 = None
    change_7 = None

    if len(exercises_history) > 3:
        previous_3 = sum([s.weight * s.reps for ex in exercises_history[1:4] for s in ex.sets])/len(exercises_history[1:4])
        change_3 = round((current_volume / previous_3 -1 ) * 100, 1)
    if (len(exercises_history) > 7):
        previous_7 = sum([s.weight * s.reps for ex in exercises_history[1:8] for s in ex.sets])/len(exercises_history[1:8])
        change_7 = round((current_volume / previous_7 -1 ) * 100, 1)
    
    return {
        "avg_last_3": change_3, 
        "avg_last_7": change_7 
    }

def compare_previous_values(prev_ex: Exercise, current_ex: Exercise):
    prev_volume = sum([ex.weight * ex.reps for ex in prev_ex.sets])
    current_volume = sum([ex.weight * ex.reps for ex in current_ex.sets])
   
    volume_change = round((current_volume / prev_volume - 1) * 100, 1)
    return volume_change
    

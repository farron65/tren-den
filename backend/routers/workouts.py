from fastapi import APIRouter, Depends, HTTPException, Query

from auth_utils import get_current_active_user

from sqlmodel import select
from sqlalchemy.orm import selectinload

from sqlalchemy import desc, func
from database import SessionDep

from typing import Annotated

from models import User, Workout, Exercise, SetDetails
from schemas import WorkoutCreate, WorkoutResponse, PaginatedWorkoutResponse, WorkoutCalendar

from queries import get_user_workout

router = APIRouter()

@router.post("", response_model=WorkoutResponse)
async def post_workout(workout: WorkoutCreate, current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    
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

@router.get("", response_model=PaginatedWorkoutResponse)
async def get_user_workouts(
    current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 10):
    
    count_result = session.exec(select(func.count()).select_from(Workout).where(Workout.user == current_user))
    total = count_result.one() or 0
    
    query = select(Workout).options(
                selectinload(Workout.exercises).options(selectinload(Exercise.sets))).where(Workout.user == current_user).order_by(desc(Workout.date)).offset(skip).limit(limit) # type: ignore -- .order_by(Workout.date.desc()) type checker 😭
    user_workouts = session.exec(query).all()
    
    has_more = skip + len(user_workouts) < total
    
    
    return PaginatedWorkoutResponse(
        workouts=[WorkoutResponse.model_validate(workout) for workout in user_workouts],
        total=total,
        skip=skip,
        limit=limit,
        has_more=has_more,
    )
    
@router.get("/calendar", response_model=list[WorkoutCalendar])
async def get_workout_calendar(current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    user_workouts = session.exec(select(Workout).order_by(desc(Workout.date)).where(Workout.user == current_user)).all() # type: ignore
    return user_workouts
    
@router.get("/{workout_id}", response_model=WorkoutResponse)
async def get_own_workout(workout_id: int, current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    user_workout = session.exec(select(Workout).where(Workout.user == current_user).where(Workout.id == workout_id)).first()
    if not user_workout:
        raise HTTPException(status_code=404, detail="Not Found")
    return user_workout 

@router.put("/{workout_id}", response_model=WorkoutResponse)
async def update_workout(workout_id: int, updated_workout: WorkoutCreate, current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    user_workout = get_user_workout(workout_id, current_user, session)
    
    if (user_workout is None):
        raise HTTPException(status_code=404, detail="Not Found")
    
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
        raise HTTPException(status_code=404, detail="Not Found")
    session.delete(workout)
    session.commit()
    return {"Success": True}


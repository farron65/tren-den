from fastapi import APIRouter, Depends, HTTPException, Query

from auth_utils import get_current_active_user

from sqlmodel import select
from sqlalchemy.orm import selectinload

from sqlalchemy import desc, func
from database import SessionDep

from typing import Annotated

from models import User, Workout, Exercise, SetDetails
from schemas import WorkoutCreate, WorkoutResponse, PaginatedWorkoutResponse, WorkoutCalendar

from queries import create_workout, get_user_workout

router = APIRouter()

@router.post("", response_model=WorkoutResponse)
async def post_workout(workout: WorkoutCreate, current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    result = await create_workout(workout, current_user, session)
    return result

@router.get("", response_model=PaginatedWorkoutResponse)
async def get_user_workouts(
    current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 10):
    
    result = await session.execute(select(func.count()).select_from(Workout).where(Workout.user == current_user))
    count_result = result.scalars()
    total = count_result.one() or 0
    
    query = select(Workout).options(
            selectinload(Workout.exercises).options(selectinload(Exercise.sets))).where(Workout.user == current_user).order_by(desc(Workout.date)).offset(skip).limit(limit) # type: ignore -- .order_by(Workout.date.desc()) type checker 😭
    result = await session.execute(query)
    user_workouts = result.scalars().all()
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
    user_workouts = await session.execute(select(Workout).order_by(desc(Workout.date)).where(Workout.user == current_user)) # type: ignore
    return user_workouts.scalars().all()
    
@router.get("/{workout_id}", response_model=WorkoutResponse)
async def get_own_workout(workout_id: int, current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    workout = await get_user_workout(workout_id, current_user, session)
    if workout is None:
        raise HTTPException(status_code=404, detail="Not Found")
    return workout

@router.put("/{workout_id}", response_model=WorkoutResponse)
async def update_workout(workout_id: int, updated_workout: WorkoutCreate, current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    user_workout = await get_user_workout(workout_id, current_user, session)
    
    if (user_workout is None):
        raise HTTPException(status_code=404, detail="Not Found")
    
    user_workout.workout_name = updated_workout.workout_name
    user_workout.date = updated_workout.date
    
    for ex in user_workout.exercises:
        await session.delete(ex)

    for updated_ex in updated_workout.exercises:
        db_exercise = Exercise(exercise_name=updated_ex.exercise_name, workout=user_workout)
        
        for updated_set in updated_ex.sets:
            db_set = SetDetails(weight=updated_set.weight, reps=updated_set.reps, exercise=db_exercise)
            
        session.add(db_exercise)

    await session.commit() # save everything first
    await session.refresh(user_workout)
    
    result = await session.execute(
        select(Workout)
        .where(Workout.id == workout_id)
        .options(selectinload(Workout.exercises).selectinload(Exercise.sets))  # type: ignore
    )
    return result.scalars().one()

@router.delete("/{workout_id}")
async def delete_workout(workout_id: int, current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    workout = await get_user_workout(workout_id, current_user, session)
    if not workout:
        raise HTTPException(status_code=404, detail="Not Found")
    await session.delete(workout)
    await session.commit()
    return {"Success": True}


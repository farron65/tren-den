from fastapi import APIRouter, Depends, HTTPException

from typing import Annotated

from sqlmodel import col, select
from database import SessionDep
from sqlalchemy import func

from models import User, Workout

from schemas import UserBase, DeleteAccountRequest

from auth_utils import authenticate_user, get_current_active_user

import datetime

router = APIRouter()

@router.get("/about", response_model=UserBase)
async def read_users_me(current_user: Annotated[User, Depends(get_current_active_user)]):
    return current_user

@router.get("/stats")
async def get_user_stats(current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    month_start = datetime.datetime.now(datetime.timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    result = await session.execute(
            select(
                func.count(), # total workouts
                func.count().filter(col(Workout.date) >= month_start), # this month workouts
            ).select_from(Workout).where(Workout.user_id == current_user.id)
        )
    total_workouts, current_month_workouts = result.one()

    return {"total_workouts": total_workouts, "current_month_workouts": current_month_workouts}

@router.delete("/delete/me")
async def delete_user(deletion_conf: DeleteAccountRequest, current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    user = await authenticate_user(session, current_user.username, deletion_conf.password)
    if user:
        if deletion_conf.confirmation.lower() == "yes":
            await session.delete(user)
            await session.commit()
            return {"Success": True}
        
        raise HTTPException(400, "Bad Request")    
    raise HTTPException(401, "Invalid Credentials")
from fastapi import APIRouter, Depends, HTTPException

from typing import Annotated

from sqlmodel import select
from database import SessionDep
from sqlalchemy import extract

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
    result = await session.execute(select(Workout).where(Workout.user == current_user))
    total_workouts = len(result.scalars().all())
    
    result = await session.execute(select(Workout).where(Workout.user == current_user).where(extract("MONTH", Workout.date) == datetime.datetime.now().month)) # type: ignore
    current_month_workouts = len(result.scalars().all())
    
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
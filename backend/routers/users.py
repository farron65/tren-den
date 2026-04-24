from fastapi import APIRouter, Depends, HTTPException

from typing import Annotated

from database import SessionDep

from models import User

from schemas import UserBase, DeleteAccountRequest

from auth_utils import authenticate_user, get_current_active_user

router = APIRouter()

@router.get("/about", response_model=UserBase)
async def read_users_me(current_user: Annotated[User, Depends(get_current_active_user)]):
    return current_user

@router.delete("/delete/me")
async def delete_user(deletion_conf: DeleteAccountRequest, current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    user = authenticate_user(session, current_user.username, deletion_conf.password)
    if user:
        if deletion_conf.confirmation.lower() == "yes":
            session.delete(user)
            session.commit()
            return {"Success": True}
        
        raise HTTPException(400, "Bad Request")    
    raise HTTPException(401, "Invalid Credentials")
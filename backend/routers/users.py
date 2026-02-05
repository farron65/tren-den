from fastapi import APIRouter, Depends, HTTPException

from sqlmodel import select

from typing import Annotated

from database import SessionDep

from models import User

from schemas import UserSignUp,UserRead, DeleteAccountRequest

from auth_utils import authenticate_user, hash_password, get_current_active_user, create_access_token, create_refresh_token

router = APIRouter()

@router.get("/me", response_model=UserRead)
async def read_users_me(current_user = Depends(get_current_active_user)):
    return current_user

@router.post("/signup", response_model=UserSignUp)
async def signup(user: UserSignUp, session: SessionDep):

    existing_user = session.exec(select(User).where(User.username == user.username)).first()
    
    if existing_user:
        raise HTTPException(409, "User already exists")
    else:
        user_password = hash_password(user.password)
        db_user = User(username=user.username, email = user.email, hashed_password=user_password)
    
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return user

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
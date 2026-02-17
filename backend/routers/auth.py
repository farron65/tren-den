
from fastapi import APIRouter, Depends, HTTPException, Form

from fastapi.security import OAuth2PasswordRequestForm
from auth_utils import authenticate_user, hash_password, create_access_token, create_refresh_token
import secrets

from sqlmodel import select
from datetime import timedelta, datetime, timezone
from database import SessionDep

from models import User, RefreshToken
from schemas import UserBase, UserSignUp, UserForgotPassword, UserResetPassword, Token

from services import email

router = APIRouter()

@router.post("/signup", response_model=UserBase)
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

@router.post("/login", response_model=Token)
async def login(session: SessionDep, form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(session, form_data.username, form_data.password)
    if not user:
        raise HTTPException(401, "Not authorized")
    
    if user.id is None:
        raise HTTPException(500, "User ID is missing after authentication")
    
    access_token_expire = timedelta(minutes=15)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expire
    )
    
    refresh_token = create_refresh_token(user.id, session)
    return Token(access_token=access_token, refresh_token=refresh_token, token_type="bearer")

@router.post("/auth/refresh", response_model=Token)
async def refresh_token_endpoint(session: SessionDep, refresh_token: str = Form( )):
    token = session.exec(select(RefreshToken).where(RefreshToken.refresh_token == refresh_token)).first()
    
    if not token or token.revoked:
        raise HTTPException(401, "Invalid refresh token")
    
    if token.exp.replace(tzinfo=timezone.utc) <= datetime.now(timezone.utc):
        raise HTTPException(401, "Refresh token is expired")
    
    user = token.user
    
    if not user.id:
        raise HTTPException(500, "User ID is missing")
    
    token.revoked = True
    session.add(token)
    session.commit()
    
    new_access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=timedelta(minutes=15)
    )
    
    new_refresh_token = create_refresh_token(user.id, session)
    
    return Token(access_token=new_access_token, refresh_token=new_refresh_token, token_type="bearer")

@router.post("/forgot-password")
async def forgot_password(user_email: UserForgotPassword, session: SessionDep):
    user_in_db = session.exec(select(User).where(User.email == user_email.email)).first()
    
    if not user_in_db:
        print("didn't find email")
        return {"message": "Successfully sent the email"} # to fool the hackers 😀
    
    reset_token = secrets.token_urlsafe(32)
    reset_token_exp = datetime.now() + timedelta(minutes=15)
    
    user_in_db.reset_token = reset_token
    user_in_db.reset_token_exp = reset_token_exp
    
    session.commit()
    session.refresh(user_in_db)
    
    email.send_password_reset_email(user_in_db.email, user_in_db.username, reset_token)
    print("send the email") #that is where i left of asl;dfkjasldkjfalskdjflaskdjfa
    return {"message": "Successfully sent the email"}
    
@router.post("/reset-password")
async def reset_password(reset_forgot_password: UserResetPassword, session: SessionDep):
    user_in_db = session.exec(select(User).where(User.reset_token == reset_forgot_password.token)).first()
    if not user_in_db:
        raise HTTPException(404, "Reset token doesn't exist")
    
    if not user_in_db.reset_token_exp:
        raise HTTPException(404, "Not Found")
    
    if user_in_db.reset_token_exp < datetime.now():
        raise HTTPException(401, "Unauthorized")
    
    user_in_db.hashed_password = hash_password(reset_forgot_password.new_password)
    user_in_db.reset_token = None
    user_in_db.reset_token_exp = None
    
    session.commit()
    session.refresh(user_in_db)
    
    return {"message": "Successfully updated user's password"}
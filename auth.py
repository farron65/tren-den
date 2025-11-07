from fastapi import Depends, HTTPException, status
from hashlib import sha256
import jwt

from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

from typing import Annotated
from datetime import datetime, timedelta, timezone

from config import SECRET_KEY, ALGORITHM
from database import SessionDep

from sqlmodel import select
from models import User


oauth2 = OAuth2PasswordBearer(tokenUrl="login")

def hash_password(password: str):
    combined = password + SECRET_KEY
    hashed_password = sha256(combined.encode("UTF-8")).hexdigest()
    return hashed_password

def verify_password(plain_password: str, hashed_password):
    return hash_password(plain_password) == hashed_password

def get_user(session: SessionDep, username: str):
    existing_user = session.exec(select(User).where(User.username == username)).first()
    return existing_user if existing_user else None

def authenticate_user(session, username: str, password: str):
    user = get_user(session, username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    
    return user

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    payload = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    
    payload.update({"exp": expire})
    encoded_jwt = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
     
def get_current_user(token: Annotated[str, Depends(oauth2)], session: SessionDep):
    credentials_exception = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise credentials_exception
    except Exception:
        raise credentials_exception
    user = get_user(session, username)
    if user is None:
        raise credentials_exception
    return user
        
def get_current_active_user(user: Annotated[User, Depends(get_current_user)]):
    if not user.disabled:
        return user
    raise HTTPException(400, "Inactive")

# @app.post("/signup", response_model=UserResponse)
# async def signup(user: UserBase, session: SessionDep):
#     # if user.username in fake_users_db:
#     #     raise HTTPException(409, "User already exists")
        
#     # user_password = hash_password(user.password)
#     # fake_users_db[user.username] = {"username": user.username, "email": user.email, "hashed_password": user_password, "disabled": False}
    
#     # return UserResponse(message="Successfully created a new user")
#     existing_user = session.exec(select(UserBase).where(UserBase.user_name == user.user_name)).first()
#     if existing_user:
#         raise HTTPException(409, "User already exists")
#     session.add(user)
#     session.commit()
#     session.refresh(user)
#     return user

# @app.post("/login", response_model=Token)
# async def login(form_data: OAuth2PasswordRequestForm = Depends()):
#     user = authenticate_user(fake_users_db, form_data.username, form_data.password)
#     if not user:
#         raise HTTPException(401, "Not authorized")
    
    
#     access_token_expire = timedelta(minutes=15)
#     access_token = create_access_token(
#         data={"sub": user.username}, expires_delta=access_token_expire
#     )
#     return Token(access_token=access_token, token_type="bearer")
    
# @app.get("/users/me", response_model=User)
# async def read_users_me(current_user = Depends(get_current_active_user)):
#     return current_user
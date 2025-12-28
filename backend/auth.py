from fastapi import Depends, HTTPException, status
from hashlib import sha256
import bcrypt
import jwt

from fastapi.security import OAuth2PasswordBearer

from typing import Annotated
from datetime import datetime, timedelta, timezone

from config import SECRET_KEY, ALGORITHM
from database import SessionDep

from sqlmodel import select
from models import User

# OAuth2 scheme that extracts JWT tokens from Authorization headers
# tokenUrl tells FastAPI docs where to authenticate (the /login endpoint)
oauth2 = OAuth2PasswordBearer(tokenUrl="login")

def hash_password(password: str):
    hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    return hashed_password

def verify_password(plain_password: str, hashed_password: str):
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def get_user(session: SessionDep, username: str):
    # Returns None instead of raising exception to prevent username enumeration
    # Callers can check for None and provide a generic "invalid credentials" error
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
    if "sub" not in data:
        raise ValueError("Sub is required")
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
        # Verify and decode the JWT token using the SECRET_KEY
        # Raises exception if token is invalid, expired, or tampered with
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

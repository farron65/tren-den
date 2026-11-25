from httpx import AsyncClient
import pytest

from sqlmodel import select

from models import User, RefreshToken
from datetime import datetime, timedelta

from auth_utils import verify_password

async def test_signup_success(create_user):
    response = create_user
    
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "user"
    assert data["email"] == "user@email.com"
    
@pytest.mark.usefixtures("create_user")
async def test_signup_duplicate(client: AsyncClient):
    response = await client.post(
        "/signup",
        json={
            "username": "user",
            "email": "user@email.com",
            "password": "test123"
        }
    )
    assert response.status_code == 409
    
async def test_login_success(client: AsyncClient, create_user):
    user_credentials = create_user.json()
    
    response = await client.post(
        "/login",
        data={
            "username": user_credentials["username"],
            "password": "test123"
        }
    )
    
    assert response.status_code == 200
    
@pytest.mark.usefixtures("create_user")
async def test_login_wrong_password(client: AsyncClient):
    response = await client.post(
        "/login",
        data={
            "username": "user",
            "password": "123test"
        }
    )
    
    assert response.status_code == 401
    
@pytest.mark.usefixtures("create_user")
async def test_login_nonexistent_user(client: AsyncClient):
    response = await client.post(
        "/login",
        data={
            "username": "auth_user",
            "password": "123test"
        }
    )
    
    assert response.status_code == 401
        
async def test_refresh_token_success(client: AsyncClient, create_and_login_user, session_fixture):
    token = create_and_login_user["refresh_token"]
    
    result = await session_fixture.execute(
        select(RefreshToken).where(RefreshToken.refresh_token == token)
    )
    user_refresh_token = result.scalars().first()
    
    response = await client.post(
        "/auth/refresh",
        data={
            "refresh_token": user_refresh_token.refresh_token
        }
    )
    
    result = await session_fixture.execute(
        select(RefreshToken).where(RefreshToken.refresh_token == token)
    )
    user_refresh_token = result.scalars().first()
    
    assert response.status_code == 200
    assert user_refresh_token.revoked is True

async def test_refresh_token_invalid(client: AsyncClient, create_and_login_user):
    token = create_and_login_user["access_token"] + "1"
    
    response = await client.post(
        "/auth/refresh",
        data={
            "refresh_token": token
        }
    )
    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid refresh token"}
    
async def test_refresh_token_revoked(client: AsyncClient, create_and_login_user, session_fixture):
    token = create_and_login_user["refresh_token"]
    
    response = await client.post(
        "/auth/refresh",
        data={
            "refresh_token": token
        }
    )
    
    assert response.status_code == 200
    
    result = await session_fixture.execute(
        select(RefreshToken).where(RefreshToken.refresh_token == token)
    )
    user_refresh_token = result.scalars().first()
    
    response = await client.post(
        "/auth/refresh",
        data={
            "refresh_token": token
        }
    )
    
    assert response.status_code == 401
    assert user_refresh_token.revoked is True
    assert response.json() == {"detail": "Invalid refresh token"}
    
async def test_refresh_token_expired(client: AsyncClient, create_and_login_user, session_fixture):
    token = create_and_login_user["refresh_token"]
    
    result = await session_fixture.execute(
        select(RefreshToken).where(RefreshToken.refresh_token == token)
    )
    user_refresh_token = result.scalars().first()
    user_refresh_token.exp = datetime.now()
    await session_fixture.commit()
    response = await client.post(
        "/auth/refresh",
        data={
            "refresh_token": user_refresh_token.refresh_token
        }
    )
    assert response.status_code == 401
    assert response.json() == {"detail": "Refresh token is expired"}

    
async def test_forgot_password_success(client: AsyncClient, create_user, email_mock):
    response = await client.post(
        "/forgot-password",
        json={
            "email": create_user.json()["email"]
        }
    )
    
    assert response.status_code == 200
    assert email_mock["value"] is True
    
async def test_forgot_password_nonexistent_email(client: AsyncClient, email_mock):
    response = await client.post(
        "/forgot-password",
        json={
            "email": "random_email@gmail.com"
        }
    )
    
    assert response.status_code == 200
    assert email_mock["value"] is False
    
async def test_forgot_password_invalid_email(client: AsyncClient, email_mock):
    response = await client.post(
        "/forgot-password",
        json={
            "email": "invalid email"
        }
    )
    
    assert response.status_code == 422
    assert email_mock["value"] is False
    
async def test_reset_password_success(client: AsyncClient, create_user, session_fixture):
    user_credentials = create_user.json()
    
    result = await session_fixture.execute(
        select(User).where(User.email == user_credentials["email"])
    )
    user = result.scalars().first()
    
    user_old_hash_password = user.hashed_password

    user.reset_token = "test_token"
    user.reset_token_exp = datetime.now() + timedelta(minutes=10)
    
    await session_fixture.commit()
    
    response = await client.post(
        "/reset-password",
        json={
            "token": user.reset_token,
            "new_password": "newpass123"
        }
    )
    
    result = await session_fixture.execute(
        select(User).where(User.email == user_credentials["email"])
    )
    user = result.scalars().first()
    
    assert response.status_code == 200
    assert user.reset_token is None
    assert user.reset_token_exp is None
    assert verify_password("newpass123", user.hashed_password) is True
    assert verify_password("test123", user.hashed_password) is False
    assert user_old_hash_password != user.hashed_password
    
async def test_reset_password_no_token(client: AsyncClient, create_user, session_fixture):
    user_credentials = create_user.json()
    
    result = await session_fixture.execute(
        select(User).where(User.email == user_credentials["email"])
    )
    user = result.scalars().first()

    user.reset_token = "test_token"
    user.reset_token_exp = datetime.now() + timedelta(minutes=10)
    user_old_password = user.hashed_password
    
    await session_fixture.commit()
    
    response = await client.post(
        "/reset-password",
        json={
            "token": "invalid token",
            "new_password": "newpass123"
        }
    )
    
    result = await session_fixture.execute(
        select(User).where(User.email == user_credentials["email"])
    )
    user = result.scalars().first()
    
    assert response.status_code == 404
    assert user_old_password == user.hashed_password
    assert user.reset_token is not None
    assert user.reset_token_exp is not None
    assert response.json() == {"detail": "Reset token doesn't exist"}
    
async def test_reset_password_no_exp(client: AsyncClient, create_user, session_fixture):
    user_credentials = create_user.json()
    
    result = await session_fixture.execute(
        select(User).where(User.email == user_credentials["email"])
    )
    user = result.scalars().first()
    
    user.reset_token = "test_token"
    user_old_password = user.hashed_password
    
    await session_fixture.commit()
    
    response = await client.post(
        "/reset-password",
        json={
            "token": user.reset_token,
            "new_password": "newpass123"
        }
    )
    
    result = await session_fixture.execute(
        select(User).where(User.email == user_credentials["email"])
    )
    user = result.scalars().first()
    
    assert response.status_code == 404
    assert user_old_password == user.hashed_password
    assert user.reset_token is not None
    assert user.reset_token_exp is None
    assert response.json() == {"detail": "Not Found"}
    
async def test_reset_password_token_expired(client: AsyncClient, create_user, session_fixture):
    user_credentials = create_user.json()
    
    result = await session_fixture.execute(
        select(User).where(User.email == user_credentials["email"])
    )
    user = result.scalars().first()

    user.reset_token = "test_token"
    user.reset_token_exp = datetime.now() - timedelta(minutes=10)
    user_old_password = user.hashed_password

    await session_fixture.commit()
    
    response = await client.post(
        "/reset-password",
        json={
            "token": user.reset_token,
            "new_password": "newpass123"
        }
    )
    
    result = await session_fixture.execute(
        select(User).where(User.email == user_credentials["email"])
    )
    user = result.scalars().first()
    
    assert response.status_code == 401
    assert user_old_password == user.hashed_password
    assert user.reset_token is not None
    assert user.reset_token_exp is not None
    assert response.json() == {"detail": "Unauthorized"}
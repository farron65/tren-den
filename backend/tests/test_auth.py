from fastapi.testclient import TestClient

from sqlmodel import select
from models import User, RefreshToken
from datetime import datetime, timedelta

from auth_utils import verify_password

def test_signup_success(create_user):
    response = create_user
    
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "user"
    assert data["email"] == "user@email.com"

def test_signup_duplicate(client: TestClient, create_user):
    response = client.post(
        "/signup",
        json={
            "username": "user",
            "email": "user@email.com",
            "password": "test123"
        }
    )
    
    assert response.status_code == 409
    
def test_login_success(client: TestClient, create_user):
    user_credentials = create_user.json()
    
    response = client.post(
        "/login",
        data={
            "username": user_credentials["username"],
            "password": "test123"
        }
    )
    
    assert response.status_code == 200
    
def test_login_wrong_password(client: TestClient, create_user):
    response = client.post(
        "/login",
        data={
            "username": "user",
            "password": "123test"
        }
    )
    
    assert response.status_code == 401
    
def test_login_nonexistent_user(client: TestClient, create_user):
    response = client.post(
        "/login",
        data={
            "username": "auth_user",
            "password": "123test"
        }
    )
    
    assert response.status_code == 401
        
def test_refresh_token_success(client: TestClient, create_and_login_user, session_fixture):
    token = create_and_login_user["refresh_token"]
    
    user_refresh_token = session_fixture.exec(
        select(RefreshToken).where(RefreshToken.refresh_token == token)
    ).first()
    
    response = client.post(
        "/auth/refresh",
        data={
            "refresh_token": user_refresh_token.refresh_token
        }
    )
    
    user_refresh_token = session_fixture.exec(
        select(RefreshToken).where(RefreshToken.refresh_token == token)
    ).first()
    
    assert response.status_code == 200
    assert user_refresh_token.revoked is True

def test_refresh_token_invalid(client: TestClient, create_and_login_user):
    token = create_and_login_user["access_token"] + "1"
    
    response = client.post(
        "/auth/refresh",
        data={
            "refresh_token": token
        }
    )
    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid refresh token"}
    
def test_refresh_token_revoked(client: TestClient, create_and_login_user, session_fixture):
    token = create_and_login_user["refresh_token"]
    
    response = client.post(
        "/auth/refresh",
        data={
            "refresh_token": token
        }
    )
    
    assert response.status_code == 200
    
    user_refresh_token = session_fixture.exec(
        select(RefreshToken).where(RefreshToken.refresh_token == token)
    ).first()
    
    response = client.post(
        "/auth/refresh",
        data={
            "refresh_token": token
        }
    )
    
    assert response.status_code == 401
    assert user_refresh_token.revoked is True
    assert response.json() == {"detail": "Invalid refresh token"}
    
def test_refresh_token_expired(client: TestClient, create_and_login_user, session_fixture):
    token = create_and_login_user["refresh_token"]
    
    user_refresh_token = session_fixture.exec(
        select(RefreshToken).where(RefreshToken.refresh_token == token)
    ).first()
    user_refresh_token.exp = datetime.now()

    session_fixture.commit()
    response = client.post(
        "/auth/refresh",
        data={
            "refresh_token": user_refresh_token.refresh_token
        }
    )
    assert response.status_code == 401
    assert response.json() == {"detail": "Refresh token is expired"}

    
def test_forgot_password_success(client: TestClient, create_user, email_mock):
    response = client.post(
        "/forgot-password",
        json={
            "email": create_user.json()["email"]
        }
    )
    
    assert response.status_code == 200
    assert email_mock["value"] is True
    
def test_forgot_password_nonexistent_email(client: TestClient, email_mock):
    response = client.post(
        "/forgot-password",
        json={
            "email": "random_email@gmail.com"
        }
    )
    
    assert response.status_code == 200
    assert email_mock["value"] is False
    
def test_forgot_password_invalid_email(client: TestClient, email_mock):
    response = client.post(
        "/forgot-password",
        json={
            "email": "invalid email"
        }
    )
    
    assert response.status_code == 422
    assert email_mock["value"] is False
    
def test_reset_password_success(client: TestClient, create_user, session_fixture):
    user_credentials = create_user.json()
    
    user = session_fixture.exec(
        select(User).where(User.email == user_credentials["email"])
    ).first()
    
    user_old_hash_password = user.hashed_password

    user.reset_token = "test_token"
    user.reset_token_exp = datetime.now() + timedelta(minutes=10)
    
    session_fixture.commit()
    
    response = client.post(
        "/reset-password",
        json={
            "token": user.reset_token,
            "new_password": "newpass123"
        }
    )
    
    user = session_fixture.exec(
        select(User).where(User.email == user_credentials["email"])
    ).first()
    
    assert response.status_code == 200
    assert user.reset_token is None
    assert user.reset_token_exp is None
    assert verify_password("newpass123", user.hashed_password) is True
    assert verify_password("test123", user.hashed_password) is False
    assert user_old_hash_password != user.hashed_password
    
def test_reset_password_no_token(client: TestClient, create_user, session_fixture):
    user_credentials = create_user.json()
    
    user = session_fixture.exec(
        select(User).where(User.email == user_credentials["email"])
    ).first()

    user.reset_token = "test_token"
    user.reset_token_exp = datetime.now() + timedelta(minutes=10)
    user_old_password = user.hashed_password
    
    session_fixture.commit()
    
    response = client.post(
        "/reset-password",
        json={
            "token": "invalid token",
            "new_password": "newpass123"
        }
    )
    
    user = session_fixture.exec(
        select(User).where(User.email == user_credentials["email"])
    ).first()
    
    assert response.status_code == 404
    assert user_old_password == user.hashed_password
    assert user.reset_token is not None
    assert user.reset_token_exp is not None
    assert response.json() == {"detail": "Reset token doesn't exist"}
    
def test_reset_password_no_exp(client: TestClient, create_user, session_fixture):
    user_credentials = create_user.json()
    
    user = session_fixture.exec(
        select(User).where(User.email == user_credentials["email"])
    ).first()

    user.reset_token = "test_token"
    user_old_password = user.hashed_password
    
    session_fixture.commit()
    
    response = client.post(
        "/reset-password",
        json={
            "token": user.reset_token,
            "new_password": "newpass123"
        }
    )
    
    user = session_fixture.exec(
        select(User).where(User.email == user_credentials["email"])
    ).first()
    
    assert response.status_code == 404
    assert user_old_password == user.hashed_password
    assert user.reset_token is not None
    assert user.reset_token_exp is None
    assert response.json() == {"detail": "Not Found"}
    
def test_reset_password_token_expired(client: TestClient, create_user, session_fixture):
    user_credentials = create_user.json()
    
    user = session_fixture.exec(
        select(User).where(User.email == user_credentials["email"])
    ).first()

    user.reset_token = "test_token"
    user.reset_token_exp = datetime.now() - timedelta(minutes=10)
    user_old_password = user.hashed_password

    session_fixture.commit()
    
    response = client.post(
        "/reset-password",
        json={
            "token": user.reset_token,
            "new_password": "newpass123"
        }
    )
    
    user = session_fixture.exec(
        select(User).where(User.email == user_credentials["email"])
    ).first()
    
    assert response.status_code == 401
    assert user_old_password == user.hashed_password
    assert user.reset_token is not None
    assert user.reset_token_exp is not None
    assert response.json() == {"detail": "Unauthorized"}
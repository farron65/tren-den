from httpx import AsyncClient
from datetime import datetime, timedelta, timezone

import pytest

async def test_read_about(client: AsyncClient, create_and_login_user):
    token = create_and_login_user["access_token"]
    
    response = await client.get(
        "/about",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200

async def test_about_unauthorized(client: AsyncClient):
    response = await client.get("/about")
    assert response.status_code == 401
    
    data = response.json()
    assert "detail" in data

async def test_delete_user(client: AsyncClient, create_and_login_user):
    token = create_and_login_user["access_token"]
    
    response = await client.request(
        "DELETE",
        "/delete/me",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "password": "test123",
            "confirmation": "yes"
        }
    )
    
    assert response.status_code == 200
    
    data = response.json()
    assert data["Success"] == True
    
async def test_delete_wrong_password(client: AsyncClient, create_and_login_user):
    token = create_and_login_user["access_token"]
    
    response = await client.request(
        "DELETE",
        "/delete/me",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "password": "123test",
            "confirmation": "yes"
        }
    )
    
    assert response.status_code == 401

async def test_delete_no_confirmation(client: AsyncClient, create_and_login_user):
    token = create_and_login_user["access_token"]
    
    response = await client.request(
        "DELETE",
        "/delete/me",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "password": "test123",
            "confirmation": "no"
        }
    )
    
    assert response.status_code == 400
    
    data = response.json()
    assert "detail" in data
    
async def test_delete_user_no_credentials(client: AsyncClient):
    response = await client.request(
        "DELETE",
        "/delete/me",
        json={
            "password": "test123",
            "confirmation": "yes"
        }
    )
    
    assert response.status_code == 401
    data = response.json()
    assert "detail" in data

# ---------- /stats ----------

def _this_month_dates():
    """Dates relative to today so the tests keep passing in any month."""
    today = datetime.now(timezone.utc).date()
    last_month = today.replace(day=1) - timedelta(days=1)
    same_month_last_year = today.replace(year=today.year - 1, day=1)
    return today, last_month, same_month_last_year

async def test_stats_no_workouts(client: AsyncClient, create_and_login_user):
    token = create_and_login_user["access_token"]

    response = await client.get("/stats", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert response.json() == {"total_workouts": 0, "current_month_workouts": 0}

async def test_stats_counts_total_and_current_month(client: AsyncClient, create_and_login_user, create_workout):
    token = create_and_login_user["access_token"]
    today, last_month, same_month_last_year = _this_month_dates()

    await create_workout(today.replace(day=1).isoformat())
    await create_workout(today.isoformat())
    await create_workout(last_month.isoformat())
    await create_workout(same_month_last_year.isoformat()) # same month number, different year

    response = await client.get("/stats", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert response.json() == {"total_workouts": 4, "current_month_workouts": 2}

@pytest.mark.usefixtures("create_and_login_user")
async def test_stats_ignores_other_users_workouts(client: AsyncClient, create_workout):
    today, _, _ = _this_month_dates()
    await create_workout(today.isoformat()) # belongs to "user"

    await client.post(
        "/signup",
        json={"username": "other", "email": "other@email.com", "password": "test123"}
    )
    login = await client.post("/login", data={"username": "other", "password": "test123"})
    other_token = login.json()["access_token"]

    response = await client.get("/stats", headers={"Authorization": f"Bearer {other_token}"})

    assert response.status_code == 200
    assert response.json() == {"total_workouts": 0, "current_month_workouts": 0}

async def test_stats_unauthorized(client: AsyncClient):
    response = await client.get("/stats")
    assert response.status_code == 401

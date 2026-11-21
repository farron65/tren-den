from httpx import AsyncClient

from sqlmodel import select
from sqlalchemy.orm import selectinload

from datetime import datetime, timedelta

from models import User, Workout, Exercise

from auth_utils import create_access_token

async def test_post_workout_success(client: AsyncClient, create_and_login_user, create_workout, session_fixture):
    user_token = create_and_login_user["access_token"]
    
    user_workout = await create_workout()
    response = await client.post(
        "/workouts",
        headers={
            "Authorization": f"Bearer {user_token}",
            "Content-Type": "application/json"
        },
        json=user_workout
    )
    
    result = await session_fixture.execute(
        select(User).where(User.username == "user")
    )

    user_obj = result.scalars().first()
    
    assert response.status_code == 200
    
    response_data = response.json()
    
    result = await session_fixture.execute(
        select(Workout).where(Workout.id == response_data["id"]).where(Workout.user == user_obj).options(
            (selectinload(Workout.exercises).selectinload(Exercise.sets)) #type: ignore
        )
    )
    db_workout = result.scalars().first()
    
    assert db_workout.workout_name == response_data["workout_name"]
    assert db_workout.date == datetime.fromisoformat(response_data["date"])
    assert len(db_workout.exercises) == len(response_data["exercises"])
    
    for i in range(len(db_workout.exercises)):
        db_ex = db_workout.exercises[i]
        response_ex = response_data["exercises"][i]
        assert db_ex.exercise_name == response_ex["exercise_name"]
        assert len(db_ex.sets) == len(response_ex["sets"])
        for j in range(len(db_ex.sets)):
            db_set = db_ex.sets[j]
            response_set = response_ex["sets"][j]
            
            assert db_set.weight == response_set["weight"]
            assert db_set.reps == response_set["reps"]
            assert db_set.rest_time == response_set["rest_time"]
            
async def test_post_workout_bad_token(client: AsyncClient, create_and_login_user):
    user_token = create_and_login_user["access_token"] + "1"
    
    response = await client.post(
        "/workouts",
        headers={
            "Authorization": f"Bearer {user_token}",
            "Content-Type": "application/json"
        },
        json={"": ""}
    )
    
    response_data = response.json()
    
    assert response.status_code == 401
    assert response_data == {"detail": "Could not validate credentials"}
    
async def test_post_workout_exp_token(client: AsyncClient, create_user):
    user_credentials = create_user.json()
    
    token_exp = timedelta(minutes=-59)
    expired_access_token = create_access_token(data={"sub": user_credentials["username"]}, expires_delta=token_exp)
    
    wk = {
        "workout_name": "Upper",
        "date": "2026-12-12",
        "exercises": [
            {
                "exercise_name": "Lat pulldown",
                "rest_time": 180,
                "sets": [
                    {
                        "weight": 140,
                        "reps": 8,
                        "rest_time": 180
                    }
                ]
            }
        ]
    }
    
    response = await client.post(
        "/workouts",
        headers={
            "Authorization": f"Bearer {expired_access_token}"
        },
        json=wk
    )
    
    assert response.status_code == 401
    
async def test_post_workout_invalid_field(client: AsyncClient, create_and_login_user):
    user_token = create_and_login_user["access_token"]
    
    user_workout = {
        "workout_name": "push",
        "date": "2026-13-02",
        "exercises": []
    }
    
    response = await client.post(
        "/workouts",
        headers={
            "Authorization": f"Bearer {user_token}",
            "Content-Type": "application/json"
        },
        json=user_workout
    )
    assert response.status_code == 422
    
async def test_get_workouts_success(client: AsyncClient, create_and_login_user):
    user_token = create_and_login_user["access_token"]
    wk_dates = ["2026-02-13", "2026-02-14", "2026-02-19"]
    
    for i in range(len(wk_dates)):
        user_workout = {
            "workout_name": "push",
            "date": wk_dates[i],
            "exercises": [
                {
                    "exercise_name": "Chest Fly",
                    "rest_time": 180,
                    "sets": [
                        {
                            "weight": 140,
                            "reps": 7,
                            "rest_time": 180
                        },
                        {
                            "weight": 127.5,
                            "reps": 5,
                            "rest_time": 180
                        }
                    ]
                }
            ]
        }
        
        await client.post(
            "/workouts",
            headers={
                "Authorization": f"Bearer {user_token}",
                "Content-Type": "application/json"
            },
            json=user_workout
        )
    
    response = await client.get(
        "/workouts",
        headers={
            "Authorization": f"Bearer {user_token}"
        }
    )
    
    assert response.status_code == 200
    response_data = response.json()
    assert len(response_data["workouts"]) == len(wk_dates)
    
    # reverse loop, since the endpoint returns workouts in descending order
    date_obj = [wk_dates[i] for i in range(len(wk_dates)-1, -1, -1)] 
    for dt in range(len(wk_dates)):
        # to slice '2026-12-12T00:00:00' --> '2026-12-12'
        assert response_data["workouts"][dt]["date"][:10] == date_obj[dt]
    
async def test_get_workouts_bad_token(client: AsyncClient, create_and_login_user):
    user_token = create_and_login_user["access_token"] + "1"
    
    response = await client.get(
        "/workouts",
        headers={
                "Authorization": f"Bearer {user_token}",
                "Content-Type": "application/json"
        },
    )
    
    assert response.status_code == 401
    
async def test_get_individual_workout_success(client: AsyncClient, create_and_login_user, create_workout):
    user_token = create_and_login_user["access_token"]
    await create_workout()
    response = await client.get(
        "/workouts/1",
        headers={
                "Authorization": f"Bearer {user_token}",
                "Content-Type": "application/json"
        },
    )
    
    assert response.status_code == 200
    
async def test_get_workout_not_exist(client: AsyncClient, create_and_login_user):
    user_token = create_and_login_user["access_token"]
        
    response = await client.get(
        "/workouts/-1",
        headers={
            "Authorization": f"Bearer {user_token}"
        },
    )
    
    assert response.status_code == 404
    assert response.json() == {"detail": "Not Found"}
    
async def test_update_workout_success(client: AsyncClient, create_and_login_user, create_workout):
    user_token = create_and_login_user["access_token"]
    await create_workout()
    updated_workout = {
        "workout_name": "Upper",
        "date": "2026-12-12",
        "exercises": [
            {
                "exercise_name": "Lat pulldown",
                "rest_time": 180,
                "sets": [
                    {
                        "weight": 140,
                        "reps": 8,
                        "rest_time": 180
                    },
                    {
                        "weight": 145,
                        "reps": 8,
                        "rest_time": 180
                    },
                    {
                        "weight": 145,
                        "reps": 5,
                        "rest_time": 180
                    }
                ]
            },
            {
                "exercise_name": "Chest Fly",
                "rest_time": 180,
                "sets": [
                    {
                        "weight": 140,
                        "reps": 7,
                        "rest_time": 180
                    }
                ]
            }
        ]
    }
    
    response = await client.put(
        "/workouts/1",
        headers={
            "Authorization": f"Bearer {user_token}",
            "Content-Type": "application/json"
        },
        json=updated_workout
    )
    
    assert response.status_code == 200
    
    response_data = response.json()
    
    assert response_data["workout_name"] == updated_workout["workout_name"]
    # to slice '2026-12-12T00:00:00' --> '2026-12-12'
    assert response_data["date"][:10] == updated_workout["date"]
    assert len(response_data["exercises"]) == len(updated_workout["exercises"])
    
async def test_update_workout_not_found(client: AsyncClient, create_and_login_user, create_workout):
    user_token = create_and_login_user["access_token"]
    workout = await create_workout()
    response = await client.put(
        "/workouts/-1",
        headers={
            "Authorization": f"Bearer {user_token}",
            "Content-Type": "application/json"
        },
        json=workout
    )
    
    assert response.status_code == 404
    assert response.json() == {"detail": "Not Found"}
    
async def test_update_workout_invalid_fields(client: AsyncClient, create_and_login_user):
    user_token = create_and_login_user["access_token"]
    
    updated_workout = {
        "workout_name": "push",
        "date": "2026-02-13",
        "exercises": [
            {
                "rest_time": 180,
                "sets": [
                    {
                        "weight": 140,
                        "reps": 7,
                        "rest_time": 180
                    },
                    {
                        "weight": 127.5,
                        "reps": 5,
                        "rest_time": 180
                    }
                ]
            }
        ]
    }
    
    response = await client.put(
        "/workouts/-1",
        headers={
            "Authorization": f"Bearer {user_token}",
            "Content-Type": "application/json"
        },
        json=updated_workout
    )
    
    assert response.status_code == 422
    
async def test_update_workout_bad_token(client: AsyncClient, create_and_login_user, create_workout):
    user_token = create_and_login_user["access_token"] + "1"
    workout = await create_workout()
    response = await client.put(
        "/workouts/-1",
        headers={
            "Authorization": f"Bearer {user_token}",
            "Content-Type": "application/json"
        },
        json=workout
    )
    
    assert response.status_code == 401
    
async def test_delete_workout_success(client: AsyncClient, create_and_login_user, create_workout):
    user_token = create_and_login_user["access_token"]
    await create_workout()
    response = await client.request(
        "DELETE",
        "/workouts/1",
        headers={
            "Authorization": f"Bearer {user_token}"
        }
    )
    
    assert response.status_code == 200
    
    response = await client.get(
        "/workouts/1",
        headers={
            "Authorization": f"Bearer {user_token}"
        }
    )
    
    assert response.status_code == 404
    
async def test_delete_workout_not_found(client: AsyncClient, create_and_login_user):
    token = create_and_login_user["access_token"]

    response = await client.request(
        "DELETE",
        "/workouts/1",
        headers={
            "Authorization": f"Bearer {token}"
        }
    )
    
    assert response.status_code == 404
    assert response.json() == {"detail": "Not Found"}
    
async def test_delete_workout_bad_token(client: AsyncClient, create_and_login_user):
    token = create_and_login_user["access_token"] + "1"
    response = await client.request(
        "DELETE",
        "/workouts/1",
        headers={
            "Authorization": f"Bearer {token}"
        }
    )
    
    assert response.status_code == 401
from fastapi.testclient import TestClient

from sqlmodel import select
from datetime import datetime, timedelta

from models import User, Workout

from auth_utils import create_access_token

def test_post_workout_success(client: TestClient, create_and_login_user, create_workout, session_fixture):
    user_token = create_and_login_user["access_token"]
    
    user_workout = create_workout()
    response = client.post(
        "/workouts",
        headers={
            "Authorization": f"Bearer {user_token}",
            "Content-Type": "application/json"
        },
        json=user_workout
    )
    
    user_obj = session_fixture.exec(
        select(User).where(User.username == "user")
    ).first()
    
    assert response.status_code == 200
    
    response_data = response.json()
    
    db_workout = session_fixture.exec(
        select(Workout).where(Workout.id == response_data["id"]).where(Workout.user == user_obj)
    ).first()
    
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
            
def test_post_workout_bad_token(client: TestClient, create_and_login_user):
    user_token = create_and_login_user["access_token"] + "1"
    
    response = client.post(
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
    
def test_post_workout_exp_token(client: TestClient, create_user):
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
    
    response = client.post(
        "/workouts",
        headers={
            "Authorization": f"Bearer {expired_access_token}"
        },
        json=wk
    )
    
    assert response.status_code == 401
    
def test_post_workout_invalid_field(client: TestClient, create_and_login_user):
    user_token = create_and_login_user["access_token"]
    
    user_workout = {
        "workout_name": "push",
        "date": "2026-13-02",
        "exercises": []
    }
    
    response = client.post(
        "/workouts",
        headers={
            "Authorization": f"Bearer {user_token}",
            "Content-Type": "application/json"
        },
        json=user_workout
    )
    assert response.status_code == 422
    
def test_get_workouts_success(client: TestClient, create_and_login_user):
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
        
        client.post(
            "/workouts",
            headers={
                "Authorization": f"Bearer {user_token}",
                "Content-Type": "application/json"
            },
            json=user_workout
        )
    
    response = client.get(
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
    
def test_get_workouts_bad_token(client: TestClient, create_and_login_user):
    user_token = create_and_login_user["access_token"] + "1"
    
    response = client.get(
        "/workouts",
        headers={
                "Authorization": f"Bearer {user_token}",
                "Content-Type": "application/json"
        },
    )
    
    assert response.status_code == 401
    
def test_get_individual_workout_success(client: TestClient, create_and_login_user, create_workout):
    user_token = create_and_login_user["access_token"]
    create_workout()
    response = client.get(
        "/workouts/1",
        headers={
                "Authorization": f"Bearer {user_token}",
                "Content-Type": "application/json"
        },
    )
    
    assert response.status_code == 200
    
def test_get_workout_not_exist(client: TestClient, create_and_login_user):
    user_token = create_and_login_user["access_token"]
        
    response = client.get(
        "/workouts/-1",
        headers={
            "Authorization": f"Bearer {user_token}"
        },
    )
    
    assert response.status_code == 404
    assert response.json() == {"detail": "Not Found"}
    
def test_update_workout_success(client: TestClient, create_and_login_user, create_workout):
    user_token = create_and_login_user["access_token"]
    create_workout()
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
    
    response = client.put(
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
    
def test_update_workout_not_found(client: TestClient, create_and_login_user, create_workout):
    user_token = create_and_login_user["access_token"]
    workout = create_workout()
    response = client.put(
        "/workouts/-1",
        headers={
            "Authorization": f"Bearer {user_token}",
            "Content-Type": "application/json"
        },
        json=workout
    )
    
    assert response.status_code == 404
    assert response.json() == {"detail": "Not Found"}
    
def test_update_workout_invalid_fields(client: TestClient, create_and_login_user):
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
    
    response = client.put(
        "/workouts/-1",
        headers={
            "Authorization": f"Bearer {user_token}",
            "Content-Type": "application/json"
        },
        json=updated_workout
    )
    
    assert response.status_code == 422
    
def test_update_workout_bad_token(client: TestClient, create_and_login_user, create_workout):
    user_token = create_and_login_user["access_token"] + "1"
    workout = create_workout()
    response = client.put(
        "/workouts/-1",
        headers={
            "Authorization": f"Bearer {user_token}",
            "Content-Type": "application/json"
        },
        json=workout
    )
    
    assert response.status_code == 401
    
def test_delete_workout_success(client: TestClient, create_and_login_user, create_workout):
    user_token = create_and_login_user["access_token"]
    create_workout()
    response = client.request(
        "DELETE",
        "/workouts/1",
        headers={
            "Authorization": f"Bearer {user_token}"
        }
    )
    
    assert response.status_code == 200
    
    response = client.get(
        "/workouts/1",
        headers={
            "Authorization": f"Bearer {user_token}"
        }
    )
    
    assert response.status_code == 404
    
def test_delete_workout_not_found(client: TestClient, create_and_login_user):
    token = create_and_login_user["access_token"]

    response = client.request(
        "DELETE",
        "/workouts/1",
        headers={
            "Authorization": f"Bearer {token}"
        }
    )
    
    assert response.status_code == 404
    assert response.json() == {"detail": "Not Found"}
    
def test_delete_workout_bad_token(client: TestClient, create_and_login_user):
    token = create_and_login_user["access_token"] + "1"
    response = client.request(
        "DELETE",
        "/workouts/1",
        headers={
            "Authorization": f"Bearer {token}"
        }
    )
    
    assert response.status_code == 401
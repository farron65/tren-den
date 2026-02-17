from fastapi.testclient import TestClient

def test_get_exercise_analytics_success(client: TestClient, create_and_login_user, create_workout):
    token = create_and_login_user["access_token"]
    create_workout("2025-02-02")
    exercise_name = "Chest Fly"
    
    wk2 = [
        {
            "exercise_name": exercise_name,
            "rest_time": 180,
            "sets": [
                {
                    "weight": 200,
                    "reps": 8,
                    "rest_time": 180
                }
            ]
        }
    ]
    
    
    wk3 = [
        {
            "exercise_name": exercise_name,
            "rest_time": 180,
            "sets": [
                {
                    "weight": 100,
                    "reps": 6,
                    "rest_time": 180
                },
                {
                    "weight": 120,
                    "reps": 6,
                    "rest_time": 180
                },
            ]
        }
    ]
    
    latest_wk = [
        {
            "exercise_name": exercise_name,
            "rest_time": 180,
            "sets": [
                {
                    "weight": 120,
                    "reps": 8,
                    "rest_time": 180
                }
            ]
        }
    ]
    
    create_workout("2025-02-07", wk2)
    create_workout("2025-02-10", wk3)
    create_workout("2025-02-12", latest_wk)
    
    latest_wk_session_volume = sum([s["weight"] * s["reps"] for s in latest_wk[0]["sets"]])
    first_wk_session_volume = 100*8*2
    second_wk_session_volume = sum([s["weight"] * s["reps"] for s in wk2[0]["sets"]])
    third_wk_session_volume = sum([s["weight"] * s["reps"] for s in wk3[0]["sets"]])
    

    previous_3_volume = (first_wk_session_volume + second_wk_session_volume + third_wk_session_volume) / 3
    avg_3 = round((latest_wk_session_volume / previous_3_volume -1) * 100, 1)

    
    response = client.get(
        f"/exercises/analytics/{exercise_name}",
        headers={
            "Authorization": f"Bearer {token}",
        }
    )
    
    assert response.status_code == 200
    
    response_data = response.json()
 
    assert "data" in response_data
    assert "summary" in response_data
    
    assert response_data["summary"]["avg_last_3"] == avg_3
    
    volumes_data = response_data["data"]
    assert volumes_data[0]["session_volume"] == first_wk_session_volume
    assert volumes_data[0]["best_set_volume"] == 800
    assert volumes_data[0]["weight"] == 100
    assert volumes_data[0]["reps"] == 8
    assert volumes_data[0]["volume_change"] == None
    
    assert volumes_data[1]["session_volume"] == second_wk_session_volume
    assert volumes_data[1]["best_set_volume"] == 1600
    assert volumes_data[1]["weight"] == 200
    assert volumes_data[1]["reps"] == 8
    assert volumes_data[1]["volume_change"] == 0
    
    assert volumes_data[2]["session_volume"] == third_wk_session_volume
    assert volumes_data[2]["best_set_volume"] == 720
    assert volumes_data[2]["weight"] == 120
    assert volumes_data[2]["reps"] == 6
    assert volumes_data[2]["volume_change"] == -17.5


    assert volumes_data[3]["session_volume"] == latest_wk_session_volume
    assert volumes_data[3]["best_set_volume"] == 960
    assert volumes_data[3]["weight"] == 120
    assert volumes_data[3]["reps"] == 8
    assert volumes_data[3]["volume_change"] == -27.3
    
def test_get_exercise_analytics_empty(client: TestClient, create_and_login_user):
    token = create_and_login_user["access_token"]
    
    response = client.get(
        "exercises/analytics/chest fly",
        headers={
            "Authorization": f"Bearer {token}"
        }
    )
    
    assert response.status_code == 200
    assert response.json() == []

def test_get_exercise_analytics_auth_boundaries(client: TestClient, create_workout):
    create_workout("2025-02-02")
    exercise_name = "Chest Fly"
    
    wk2 = [
        {
            "exercise_name": exercise_name,
            "rest_time": 180,
            "sets": [
                {
                    "weight": 200,
                    "reps": 8,
                    "rest_time": 180
                }
            ]
        }
    ]
    
    
    wk3 = [
        {
            "exercise_name": exercise_name,
            "rest_time": 180,
            "sets": [
                {
                    "weight": 100,
                    "reps": 6,
                    "rest_time": 180
                },
                {
                    "weight": 120,
                    "reps": 6,
                    "rest_time": 180
                },
            ]
        }
    ]
    
    latest_wk = [
        {
            "exercise_name": exercise_name,
            "rest_time": 180,
            "sets": [
                {
                    "weight": 120,
                    "reps": 8,
                    "rest_time": 180
                }
            ]
        }
    ]
    
    create_workout("2025-02-07", wk2)
    create_workout("2025-02-10", wk3)
    create_workout("2025-02-12", latest_wk)
    
    client.post(
        "/signup",
        json={
            "username": "second_user",
            "email": "2nd@email.com",
            "password": "test123"
        }
    )
    
    second_user_token = client.post(
        "/login",
        data={
            "username": "second_user",
            "password": "test123"
        }
    ).json()["access_token"]
        
    response = client.get(
        f"/exercises/analytics/{exercise_name}",
        headers={
            "Authorization": f"Bearer {second_user_token}",
        }
    )
    
    assert response.status_code == 200
    assert response.json() == []


def test_get_exercise_analytics_case_insensitive(client: TestClient, create_and_login_user, create_workout):
    token = create_and_login_user["access_token"]
    create_workout("2025-02-02")
    exercise_name = "chest fly"
    
    wk2 = [
        {
            "exercise_name": exercise_name,
            "rest_time": 180,
            "sets": [
                {
                    "weight": 200,
                    "reps": 8,
                    "rest_time": 180
                }
            ]
        }
    ]
    
    create_workout("2025-02-03", wk2)
    
    response = client.get(
        "/exercises/analytics/CHEST FLY",
        headers={
            "Authorization": f"Bearer {token}"
        }
    )
    
    assert response.status_code == 200
    assert len(response.json()["data"]) == 2
    
def test_get_recent_exercises_success(client: TestClient, create_and_login_user, create_workout):
    token = create_and_login_user["access_token"]
    
    create_workout("2026-02-02")
    create_workout("2026-02-04")
    
    response = client.get(
        "/exercises/recent",
        headers={
            "Authorization": f"Bearer {token}"
        }
    )
    
    assert response.status_code == 200
    
    response_data = response.json()
    assert len(response_data) == 2
    assert "chest fly" == response_data[0]["exercise_name"].lower()
    assert "lat pulldown" == response_data[1]["exercise_name"].lower()
    
def test_get_recent_exercises_empty(client: TestClient, create_and_login_user):
    token = create_and_login_user["access_token"]
    
    response = client.get(
        "/exercises/recent",
        headers={
            "Authorization": f"Bearer {token}"
        }
    )
    
    assert response.status_code == 200
    assert response.json() == []
    
def test_get_recent_check_limit(client: TestClient, create_and_login_user, create_30_workouts):
    token = create_and_login_user["access_token"]
    response = client.get(
        "/exercises/recent",
        headers={
            "Authorization": f"Bearer {token}"
        }
    )
    
    assert response.status_code == 200
    assert len(response.json()) == 25
    
def test_get_exercise_data_success(client: TestClient, create_and_login_user, create_workout):
    token = create_and_login_user["access_token"]
    
    create_workout("2025-02-02")
    
    response = client.get(
        "/exercises/chest fly",
        headers={
            "Authorization": f"Bearer {token}"
        }
    )
    
    assert response.status_code == 200
    assert "chest fly" in response.json()["exercise_name"].lower()
    
def test_get_exercise_data_empty(client: TestClient, create_and_login_user):
    token = create_and_login_user["access_token"]
    
    response = client.get(
        "/exercises/chest_fly",
        headers={
            "Authorization": f"Bearer {token}"
        }
    )
    
    assert response.status_code == 200
    assert response.json() == None
    
def test_get_exercise_data_auth_boundaries(client: TestClient, create_workout):
    create_workout("2025-02-02")
    
    client.post(
        "/signup",
        json={
            "username": "second_user",
            "email": "2nd@email.com",
            "password": "test123"
        }
    )
    
    second_user_token = client.post(
        "/login",
        data={
            "username": "second_user",
            "password": "test123"
        }
    ).json()["access_token"]
        
    response = client.get(
        f"/exercises/chest fly",
        headers={
            "Authorization": f"Bearer {second_user_token}",
        }
    )
    
    assert response.status_code == 200
    assert response.json() == None
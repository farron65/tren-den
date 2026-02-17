from fastapi.testclient import TestClient

def test_create_template_duplicate(client: TestClient, create_and_login_user, create_template):
    token = create_and_login_user["access_token"]
    
    response = client.post(
        "/templates",
        headers={
            "Authorization": f"Bearer {token}" 
        },
        json=create_template
    )
    
    assert response.status_code == 409
    
def test_get_template_success_with_prev_data(client: TestClient, create_and_login_user, create_workout):
    token = create_and_login_user["access_token"]
    user_workout = create_workout("2026-02-02")
    
    client.post(
        "/workouts",
        headers={
            "Authorization": f"Bearer {token}" 
        },
        json=user_workout
    )
    
    del user_workout["date"]
    
    
    client.post(
        "/templates",
        headers={
            "Authorization": f"Bearer {token}" 
        },
        json=user_workout
    )
    
    response = client.get(
        "/templates/1",
        headers={
            "Authorization": f"Bearer {token}"
        }
    )
    
    assert response.status_code == 200
    template_data = response.json()
    assert template_data["previous_workout_data"] is not None
    
    prev_workout_date = template_data["previous_workout_data"]
    
    for ex in prev_workout_date:      
        template_exercises = [i["exercise_name"] for i in template_data["exercises"]] # since exercises is a list[dict]
        assert ex["exercise_name"] in template_exercises
    
def test_get_template_success_wo_prev_data(client: TestClient, create_and_login_user, create_template):
    token = create_and_login_user["access_token"]
    
    response = client.get(
        "/templates/1",
        headers={
            "Authorization": f"Bearer {token}"
        }
    )
    
    assert response.status_code == 200
    response_data = response.json()
    assert response_data["previous_workout_data"] == []
    
def test_patch_template_values(client: TestClient, create_and_login_user, create_template):
    token = create_and_login_user["access_token"]
    template = create_template
    # print(template)
    updated_exercises = [
        {
            "exercise_name": "Chest Fly",
            "rest_time": 140,
            "sets": [
                {
                    "weight": 100,
                    "reps": 10,
                    "rest_time": 140
                }
            ]
        },
        {
            "exercise_name": "Lat pulldown",
            "rest_time": 140,
            "sets": [
                {
                    "weight": 100,
                    "reps": 10,
                    "rest_time": 140
                },
                 {
                    "weight": 100,
                    "reps": 10,
                    "rest_time": 140
                },
                  {
                    "weight": 100,
                    "reps": 10,
                    "rest_time": 140
                }
            ]
        }
    ]
    
    response = client.patch(
        "/templates/1",
        headers={
            "Authorization": f"Bearer {token}"
        },
        json=updated_exercises
    )
    
    assert response.status_code == 200
    
    updated_template = client.get(
        "/templates/1",
        headers={
            "Authorization": f"Bearer {token}"
        }
    ).json()
    
    assert len(updated_template["exercises"]) == len(updated_exercises)
    
    for i in range(len(updated_template["exercises"])):
        
        template_ex = updated_template["exercises"][i]
        assert len(template_ex["sets"]) == len(updated_exercises[i]["sets"])
        
        for j in range(len(template_ex["sets"])):
            template_sets = template_ex["sets"]
            updated_sets = updated_exercises[i]["sets"]
            assert template_sets[j]["weight"] == updated_sets[j]["weight"]
            assert template_sets[j]["reps"] == updated_sets[j]["reps"]
            assert template_sets[j]["rest_time"] == updated_sets[j]["rest_time"]
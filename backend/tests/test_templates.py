from httpx import AsyncClient
import pytest

async def test_create_template_duplicate(client: AsyncClient, create_and_login_user, create_template):
    token = create_and_login_user["access_token"]
    
    response = await client.post(
        "/templates",
        headers={
            "Authorization": f"Bearer {token}" 
        },
        json=create_template
    )
    
    assert response.status_code == 409
    
async def test_get_template_success_with_prev_data(client: AsyncClient, create_and_login_user, create_workout):
    token = create_and_login_user["access_token"]
    user_workout = await create_workout("2026-02-02")
    
    await client.post(
        "/workouts",
        headers={
            "Authorization": f"Bearer {token}" 
        },
        json=user_workout
    )
    
    del user_workout["date"]
    
    
    await client.post(
        "/templates",
        headers={
            "Authorization": f"Bearer {token}" 
        },
        json=user_workout
    )
    
    response = await client.get(
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
    
@pytest.mark.usefixtures("create_template")
async def test_get_template_success_wo_prev_data(client: AsyncClient, create_and_login_user):
    token = create_and_login_user["access_token"]
    
    response = await client.get(
        "/templates/1",
        headers={
            "Authorization": f"Bearer {token}"
        }
    )
    
    assert response.status_code == 200
    response_data = response.json()
    assert response_data["previous_workout_data"] == []

@pytest.mark.usefixtures("create_template")
async def test_patch_template_values(client: AsyncClient, create_and_login_user):
    token = create_and_login_user["access_token"]
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
    
    response = await client.patch(
        "/templates/1",
        headers={
            "Authorization": f"Bearer {token}"
        },
        json=updated_exercises
    )
    
    assert response.status_code == 200
    
    response = await client.get(
        "/templates/1",
        headers={
            "Authorization": f"Bearer {token}"
        }
    )
    updated_template = response.json()
    
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
            
async def test_update_template(client: AsyncClient, create_and_login_user, create_template):
    token = create_and_login_user["access_token"]
    template_id = create_template["id"]
    updated_template = {
        "workout_name": "Lower A",
        "exercises": [
            {
                "exercise_name": "Squat",
                "rest_time": 240,
                "sets": [
                    {"weight": 180, "reps": 5, "rest_time": 240},
                    {"weight": 180, "reps": 5, "rest_time": 240},
                    {"weight": 170, "reps": 6, "rest_time": 240}
                ]
            }
        ]
    }
    
    response = await client.put(
        f"/templates/{template_id}",
        headers={"Authorization": f"Bearer {token}"},
        json=updated_template
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["workout_name"] == "Lower A"
    assert len(data["exercises"]) == 1
    assert data["exercises"][0]["exercise_name"] == "Squat"
    assert data["exercises"][0]["rest_time"] == 240
    assert len(data["exercises"][0]["sets"]) == 3
    
    # read it back to check the update was saved and the old exercises are gone
    response = await client.get(
        f"/templates/{template_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    saved = response.json()
    assert saved["workout_name"] == "Lower A"
    assert [ex["exercise_name"] for ex in saved["exercises"]] == ["Squat"]
    assert len(saved["exercises"][0]["sets"]) == 3

async def test_update_template_not_found(client: AsyncClient, create_and_login_user):
    token = create_and_login_user["access_token"]
    
    response = await client.put(
        "/templates/999",
        headers={"Authorization": f"Bearer {token}"},
        json={"workout_name": "Nope", "exercises": []}
    )
    
    assert response.status_code == 400

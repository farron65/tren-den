from fastapi.testclient import TestClient

def test_read_me(client: TestClient, create_and_login_user):
    token = create_and_login_user["access_token"]
    
    response = client.get(
        "/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200

def test_me_unauthorized(client: TestClient):
    response = client.get("/me")
    assert response.status_code == 401
    
    data = response.json()
    assert "detail" in data

def test_delete_user(client: TestClient, create_and_login_user):
    token = create_and_login_user["access_token"]
    
    response = client.request(
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
    
def test_delete_wrong_password(client: TestClient, create_and_login_user):
    token = create_and_login_user["access_token"]
    
    response = client.request(
        "DELETE",
        "/delete/me",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "password": "123test",
            "confirmation": "yes"
        }
    )
    
    assert response.status_code == 401

def test_delete_no_confirmation(client: TestClient, create_and_login_user):
    token = create_and_login_user["access_token"]
    
    response = client.request(
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
    
def test_delete_user_no_credentials(client: TestClient):
    response = client.request(
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
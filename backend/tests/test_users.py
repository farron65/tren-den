from httpx import AsyncClient

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
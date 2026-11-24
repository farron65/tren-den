from httpx import AsyncClient

from config import BOT_API_KEY

SAMPLE = """LOWER A
Wednesday, September 30, 2026 at 16:07

Seated Leg Curl (Machine)
Set 1: 155 lb × 6

Hack Squat
Set 1: 215 lb × 6
Set 2: 225 lb × 6

Decline Crunch
Set 1: +70 lb × 6"""

HEADERS = {"X-API-Key": BOT_API_KEY}


async def test_import_strong(client: AsyncClient, create_and_login_user, monkeypatch):
    monkeypatch.setattr("routers.imports.BOT_USERNAME", "user")

    response = await client.post("/import/strong", json={"text": SAMPLE}, headers=HEADERS)

    assert response.status_code == 200
    data = response.json()
    assert data["workout_name"] == "LOWER A"
    assert len(data["exercises"]) == 3
    assert data["exercises"][2]["sets"][0]["weight"] == 70.0

    # the workout really landed in the DB under that user
    token = create_and_login_user["access_token"]
    listing = await client.get("/workouts", headers={"Authorization": f"Bearer {token}"})
    assert listing.json()["total"] == 1


async def test_import_wrong_key(client: AsyncClient, create_and_login_user, monkeypatch):
    monkeypatch.setattr("routers.imports.BOT_USERNAME", "user")

    response = await client.post(
        "/import/strong", json={"text": SAMPLE}, headers={"X-API-Key": "wrong"}
    )

    assert response.status_code == 401


async def test_import_garbage_text(client: AsyncClient, create_and_login_user, monkeypatch):
    monkeypatch.setattr("routers.imports.BOT_USERNAME", "user")

    response = await client.post("/import/strong", json={"text": "garbage"}, headers=HEADERS)

    assert response.status_code == 422
    assert "detail" in response.json()


async def test_import_bot_user_missing(client: AsyncClient, monkeypatch):
    monkeypatch.setattr("routers.imports.BOT_USERNAME", "nobody")

    response = await client.post("/import/strong", json={"text": SAMPLE}, headers=HEADERS)

    assert response.status_code == 500
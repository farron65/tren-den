from fastapi.testclient import TestClient
from httpx import AsyncClient, ASGITransport
import pytest
from main import app

from sqlmodel import SQLModel
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.pool import StaticPool
from database import get_session

import asyncio

from schemas import Token

connect_args = {"check_same_thread": False}
engine = create_async_engine("sqlite+aiosqlite:///:memory:", connect_args=connect_args, poolclass=StaticPool)

async def async_engine_create():
    async with engine.begin() as connection:
        await connection.run_sync(SQLModel.metadata.create_all)

asyncio.run(async_engine_create())

# Override the production get_session dependency
# so that all routes use the test database instead
@pytest.fixture(scope="function", autouse=True)
async def session_fixture():
    connection = await engine.connect() # create a new connection to the engine
    transaction = await connection.begin() # start it
    
    session = AsyncSession(bind=connection) # bind session to same connection
    def override_get_session(): # a function that will override 'get_session' since fastapi doesn't know how to call fixtures
        yield session # use by FastAPI routes
            
    app.dependency_overrides[get_session] = override_get_session # overriding 'get_session'
   
    yield session # make session available for tests
    
    await session.close() # close ORM session
    await transaction.rollback() # undo all sql operations done prior
    await connection.close() # terminate the connection between the db and api
    app.dependency_overrides.pop(get_session) # reset the override function for the new override in the future if not done, it will persist
 
@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        yield ac
    # Tell FastAPI to use the test session instead of the real DB session

@pytest.fixture()
async def create_user(client: AsyncClient):
    response = await client.post(
        "/signup",
        json={
            "username": "user",
            "email": "user@email.com",
            "password": "test123"
        }
    )
    
    return response

@pytest.fixture
async def create_and_login_user(client: AsyncClient) -> Token:
    await client.post(
        "/signup",
        json={
            "username": "user",
            "email": "user@email.com",
            "password": "test123"
        }
    )
    
    response = await client.post(
        "/login",
        data={
            "username": "user",
            "password": "test123"
        }
    )
    
    return response.json()
    
@pytest.fixture
def email_mock(monkeypatch):
    called = {"value": False}
    
    # override send email function so that i  avoid actual external api calls
    def mock_send_email(*args, **kwargs):
        called["value"] = True
        
    monkeypatch.setattr("services.email.send_password_reset_email", mock_send_email)
    
    return called

@pytest.fixture
async def create_workout(client: AsyncClient, create_and_login_user):
    
    async def _create_workout(dt: str = "2026-02-02", exercises: list | None = None):
        token = create_and_login_user["access_token"]
        
        if exercises is None:
            exercises = [
                {
                    "exercise_name": "Chest Fly",
                    "rest_time": 180,
                    "sets": [
                        {
                            "weight": 100,
                            "reps": 8,
                            "rest_time": 180
                        },
                        {
                            "weight": 100,
                            "reps": 8,
                            "rest_time": 180
                        }
                    ]
                },
                {
                    "exercise_name": "Lat pulldown",
                    "rest_time": 180,
                    "sets": [
                        {
                            "weight": 145,
                            "reps": 8,
                            "rest_time": 180
                        },
                        {
                            "weight": 145,
                            "reps": 8,
                            "rest_time": 180
                        },
                        {
                            "weight": 140,
                            "reps": 8,
                            "rest_time": 180
                        },
                    ]
                },
            ]
            
        user_workout = {
            "workout_name": "PUSH",
            "date": dt,
            "exercises": exercises
        }
        
        response = await client.post(
            "/workouts",
            headers={
                "Authorization": f"Bearer {token}" 
            },
            json=user_workout
        )
        
        assert response.status_code == 200
        
        return response.json()
    
    return _create_workout

@pytest.fixture
async def create_30_workouts(client: AsyncClient, create_and_login_user):
    token = create_and_login_user["access_token"]
    EXERCISE_NAMES = [
        "Bench Press", "Squat", "Deadlift", "Overhead Press", "Barbell Row",
        "Incline Press", "Leg Press", "Romanian Deadlift", "Pull Up", "Dip",
        "Lateral Raise", "Bicep Curl", "Tricep Pushdown", "Leg Curl", "Leg Extension",
        "Calf Raise", "Face Pull", "Cable Row", "Chest Fly", "Hack Squat",
        "Bulgarian Split Squat", "Hip Thrust", "Preacher Curl", "Skull Crusher",
        "Shrug", "Front Raise", "Reverse Fly", "RDL", "Lat pulldown", "Seated Wide Grip row"
    ]
    
    for i in range(len(EXERCISE_NAMES)):
        user_workout = {
            "workout_name": "PUSH",
            "date": f"2026-01-0{i+1}" if i+1 < 10 else f"2026-01-{i+1}",
            "exercises": [{
                "exercise_name": EXERCISE_NAMES[i],
                "rest_time": 180,
                "sets": [
                    {
                        "weight": 100,
                        "reps": 8,
                        "rest_time": 180
                    },
                    {
                        "weight": 100,
                        "reps": 8,
                        "rest_time": 180
                    }
                ]
            }]
        }
        response = await client.post(
            "/workouts",
            headers={
                "Authorization": f"Bearer {token}" 
            },
            json=user_workout
        )
        
        assert response.status_code == 200
    
@pytest.fixture
async def create_template(client: AsyncClient, create_and_login_user):
    token = create_and_login_user["access_token"]
    user_template = {
        "workout_name": "Upper A",
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
            },
            {
                "exercise_name": "Lat pulldown",
                "rest_time": 180,
                "sets": [
                    {
                        "weight": 145,
                        "reps": 7,
                        "rest_time": 180
                    },
                    {
                        "weight": 145,
                        "reps": 5,
                        "rest_time": 180
                    },
                    {
                        "weight": 140,
                        "reps": 4,
                        "rest_time": 180
                    },
                ]
            },
        ]
    }
    
    response = await client.post(
        "/templates",
        headers={
            "Authorization": f"Bearer {token}" 
        },
        json=user_template
    )
    
    return response.json()

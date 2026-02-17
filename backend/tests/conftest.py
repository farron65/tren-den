from fastapi.testclient import TestClient
import pytest
from main import app

from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy.pool import StaticPool
from database import get_session

from schemas import Token

connect_args = {"check_same_thread": False}
engine = create_engine("sqlite:///:memory:", connect_args=connect_args, poolclass=StaticPool)

SQLModel.metadata.create_all(engine)

# Override the production get_session dependency
# so that all routes use the test database instead
@pytest.fixture(scope="function", autouse=True)
def session_fixture():
    connection = engine.connect() # create a new connection to the engine
    transaction = connection.begin() # start it
    
    session = Session(bind=connection) # bind session to same connection
    def override_get_session(): # a function that will override 'get_session' since fastapi doesn't know how to call fixtures
        yield session # use by FastAPI routes
            
    app.dependency_overrides[get_session] = override_get_session # overriding 'get_session'
   
    yield session # make session available for tests
    
    session.close() # close ORM session
    transaction.rollback() # undo all sql operations done prior
    connection.close() # terminate the connection between the db and api
    app.dependency_overrides.pop(get_session) # reset the override function for the new override in the future if not done, it will persist
 
@pytest.fixture
def client():
    # Tell FastAPI to use the test session instead of the real DB session
    return TestClient(app)

@pytest.fixture()
def create_user(client: TestClient):
    response = client.post(
        "/signup",
        json={
            "username": "user",
            "email": "user@email.com",
            "password": "test123"
        }
    )
    
    return response

@pytest.fixture
def create_and_login_user(client: TestClient) -> Token:
    client.post(
        "/signup",
        json={
            "username": "user",
            "email": "user@email.com",
            "password": "test123"
        }
    )
    
    response = client.post(
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
def create_workout(client: TestClient, create_and_login_user):
    
    def _create_workout(dt: str = "2026-02-02", exercises: list | None = None):
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
        
        response = client.post(
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
def create_30_workouts(client: TestClient, create_and_login_user):
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
        print(user_workout)
        response = client.post(
            "/workouts",
            headers={
                "Authorization": f"Bearer {token}" 
            },
            json=user_workout
        )
        
        assert response.status_code == 200
    
@pytest.fixture
def create_template(client: TestClient, create_and_login_user):
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
    
    response = client.post(
        "/templates",
        headers={
            "Authorization": f"Bearer {token}" 
        },
        json=user_template
    )
    
    return response.json()

from sqlmodel import SQLModel, create_engine, Session
from models import Workout, Exercise, SetDetails
from typing import Annotated
from fastapi import Depends

sqlite_db_name = "database.db"
sqlite_url = f"sqlite:///{sqlite_db_name}"
connect_args = {"check_same_thread": False}

# SQLite requires check_same_thread=False for FastAPI's async operations
engine = create_engine(sqlite_url, connect_args=connect_args)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    # Provides a db session for each request
    # Session is automatically closed after the request completes
    with Session(engine) as session:
        yield session

# Type alias shortcut. Provides a database session via dependency injection
SessionDep = Annotated[Session, Depends(get_session)]


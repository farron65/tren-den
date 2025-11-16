from sqlmodel import SQLModel, create_engine, Session
from models import Workout, Exercise, SetDetails
from typing import Annotated
from fastapi import Depends

sqlite_db_name = "database.db"
sqlite_url = f"sqlite:///{sqlite_db_name}"
connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, connect_args=connect_args)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
        
SessionDep = Annotated[Session, Depends(get_session)]

        
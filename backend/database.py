from sqlmodel import SQLModel, create_engine, Session

from typing import Annotated
from fastapi import Depends

import os

DATABASE_URL = os.getenv("DATABASE_URL") or "postgresql://postgres:MonTren65$@localhost:5432/postgres"

engine = create_engine(DATABASE_URL)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    # Provides a db session for each request
    # Session is automatically closed after the request completes
    with Session(engine) as session:
        yield session

# Type alias shortcut. Provides a database session via dependency injection
SessionDep = Annotated[Session, Depends(get_session)]


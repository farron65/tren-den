from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from typing import Annotated
from fastapi import Depends

from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("Database url is missing")

engine = create_async_engine(DATABASE_URL)

async def get_session():
    # Provides a db session for each request
    # Session is automatically closed after the request completes
    async with AsyncSession(engine) as session:
        yield session

# Type alias shortcut. Provides a database session via dependency injection
SessionDep = Annotated[AsyncSession, Depends(get_session)]


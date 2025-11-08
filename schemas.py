from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class Token(BaseModel):
    access_token: str
    token_type: str
    
class UserSignUp(BaseModel):
    username: str
    email: str 
    password: str
    
class UserRead(BaseModel):
    username: str
    email: str | None = None
    disabled: bool | None = False

class UserInDB(BaseModel):
    username: str
    hashed_password: str
    email: str | None
    disabled: bool = False
    
class UserResponse(BaseModel):
    message: str
    
class Set(BaseModel):
    weight: float
    reps: int
    
class SetInDB(Set):
    id: int

class ExerciseCreate(BaseModel):
    exercise_name: str
    sets: list[Set]
    
class WorkoutCreate(BaseModel):
    workout_name: str | None = None
    date: datetime
    exercises: list[ExerciseCreate]
    
class ExerciseResponse(BaseModel):
    id: int
    exercise_name: str
    sets: list[SetInDB]
    
class WorkoutResponse(BaseModel):
    id: int
    workout_name: str | None = None
    date: datetime
    exercises: list[ExerciseResponse]
    
class SetUpdate(BaseModel):
    weight: float | None = None
    reps: int | None = None

class ExerciseUpdate(BaseModel):
    exercise_name: str | None = None
    sets: list[SetUpdate] | None = None
    
class WorkoutUpdate(BaseModel):
    workout_name: str | None = None
    date: datetime | None = None
    exercises: list[ExerciseUpdate] | None = None
    
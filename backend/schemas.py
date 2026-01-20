from pydantic import BaseModel, Field, EmailStr
from datetime import datetime

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    
class UserSignUp(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserForgotPassword(BaseModel):
    email: EmailStr
    
class UserResetPassword(BaseModel):
    token: str
    new_password: str
    
class UserRead(BaseModel):
    username: str
    email: EmailStr
    disabled: bool | None = False

class UserInDB(BaseModel):
    username: str
    hashed_password: str
    email: EmailStr
    disabled: bool = False
    
class UserResponse(BaseModel):
    message: str
    
class Set(BaseModel):
    weight: float = Field(ge=0, le=1000)
    reps: int = Field(ge=1, le=1000)
    
class SetInDB(Set):
    id: int

class ExerciseCreate(BaseModel):
    exercise_name: str
    sets: list[Set]
    
class WorkoutCreate(BaseModel):
    workout_name: str
    date: datetime
    exercises: list[ExerciseCreate]
    
class TemplateCreate(BaseModel):
    workout_name: str
    exercises: list[ExerciseCreate]
    
class ExerciseSummary(BaseModel):
    id: int
    exercise_name: str
    
class ExerciseResponse(BaseModel):
    id: int
    exercise_name: str
    sets: list[SetInDB]
    
class WorkoutResponse(BaseModel):
    id: int
    workout_name: str 
    date: datetime
    exercises: list[ExerciseResponse]
    
class TemplateResponseWithAddData(BaseModel):
    id: int
    workout_name: str
    exercises: list[ExerciseResponse]
    previous_workout_data: list[ExerciseResponse]
    
class TemplateResponse(BaseModel):
    id: int
    workout_name: str
    exercises: list[ExerciseResponse]
    
class TemplateSummary(BaseModel):
    id: int
    workout_name: str
    exercises: list[ExerciseSummary]
    
class SetUpdate(BaseModel):
    weight: float | None = Field(None, ge=0, le=1000)
    reps: int | None = Field(None, ge=0, le=1000)

class ExerciseUpdate(BaseModel):
    exercise_name: str | None = None
    
class WorkoutUpdate(BaseModel):
    workout_name: str | None = None
    date: datetime | None = None
    
class DeleteAccountRequest(BaseModel):
    password: str
    confirmation: str
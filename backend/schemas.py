from pydantic import BaseModel, Field, EmailStr, ConfigDict
from datetime import datetime

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    
class UserBase(BaseModel):
    username: str
    email: EmailStr
    
class UserSignUp(UserBase):
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
    rest_time: int
    
class SetInDB(Set):
    model_config = ConfigDict(from_attributes=True)

    id: int

class ExerciseCreate(BaseModel):
    exercise_name: str
    rest_time: int
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
    model_config = ConfigDict(from_attributes=True)

    id: int
    exercise_name: str
    rest_time: int
    sets: list[SetInDB]
    
class WorkoutResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
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
    
class PaginatedWorkoutResponse(BaseModel):
    workouts: list[WorkoutResponse]
    total: int
    skip: int
    limit: int
    has_more: bool
    
class WorkoutCalendar(BaseModel):
    workout_name: str
    date: datetime
    id: int
    
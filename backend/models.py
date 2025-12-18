from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime

class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    username: str = Field(index=True)
    email: str = Field(index=True)
    hashed_password: str
    disabled: bool | None = Field(default=False, index=True)
    workouts: list["Workout"] = Relationship(back_populates="user", cascade_delete=True)
    templates: list["Template"] = Relationship(back_populates="user", cascade_delete=True)

class Template(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    workout_name: str = Field(index=True)
    user_id: int | None = Field(default=None, foreign_key="user.id")
    user: User | None = Relationship(back_populates="templates")
    exercises: list["Exercise"] = Relationship(back_populates="template", cascade_delete=True)

class Workout(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    workout_name: str = Field(index=True)
    date: datetime = Field(index=True)
    
    user_id: int | None = Field(default=None, foreign_key="user.id")
    user: User | None = Relationship(back_populates="workouts")
    
    exercises: list["Exercise"] = Relationship(back_populates="workout", cascade_delete=True)
    
class Exercise(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    exercise_name: str = Field(index=True)
    
    workout_id: int | None = Field(default=None, foreign_key="workout.id")
    workout: Workout = Relationship(back_populates="exercises")
    
    template_id: int | None = Field(default=None, foreign_key="template.id")
    template: Template = Relationship(back_populates="exercises")
    
    sets: list["SetDetails"] = Relationship(back_populates="exercise", cascade_delete=True)

class SetDetails(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    weight: float
    reps: int
    exercise_id: int | None = Field(default=None, foreign_key="exercise.id")
    exercise: Exercise = Relationship(back_populates="sets")
    
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware

from fastapi.security import OAuth2PasswordRequestForm
import secrets

import resend

from sqlmodel import select
from sqlalchemy import func, desc, asc

from datetime import timedelta, date, datetime, timezone

from typing import Annotated, Optional

from database import create_db_and_tables, SessionDep

from models import User, Template, Workout, Exercise, SetDetails, RefreshToken

from schemas import WorkoutCreate, UserSignUp, UserForgotPassword, UserResetPassword, Token, WorkoutResponse, UserRead, DeleteAccountRequest, ExerciseCreate, TemplateCreate, TemplateResponse, TemplateSummary, TemplateResponseWithAddData

from config import *
from auth import authenticate_user, hash_password, get_current_active_user, create_access_token, create_refresh_token

from queries import get_exercise_sets, get_user_workout
    
resend.api_key = RESEND_EMAIL_API_KEY

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield
    
app = FastAPI(lifespan=lifespan)

origins = [
    "http://localhost:5173",
    "https://trenden.netlify.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/predict")
async def predict():
    return "Success"

@app.post("/signup", response_model=UserSignUp)
async def signup(user: UserSignUp, session: SessionDep):

    existing_user = session.exec(select(User).where(User.username == user.username)).first()
    
    if existing_user:
        raise HTTPException(409, "User already exists")
    else:
        user_password = hash_password(user.password)
        db_user = User(username=user.username, email = user.email, hashed_password=user_password)
    
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return user

@app.post("/login", response_model=Token)
async def login(session: SessionDep, form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(session, form_data.username, form_data.password)
    if not user:
        raise HTTPException(401, "Not authorized")
    
    if user.id is None:
        raise HTTPException(500, "User ID is missing after authentication")
    
    access_token_expire = timedelta(minutes=15)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expire
    )
    
    refresh_token = create_refresh_token(user.id, session)
    return Token(access_token=access_token, refresh_token=refresh_token, token_type="bearer")

@app.post("/auth/refresh", response_model=Token)
async def refresh_token_endpoint(session: SessionDep, refresh_token: str = Form( )):
    token = session.exec(select(RefreshToken).where(RefreshToken.refresh_token == refresh_token)).first()
    
    if not token or token.revoked:
        raise HTTPException(401, "Invalid refresh token")
    
    if token.exp.replace(tzinfo=timezone.utc) <= datetime.now(timezone.utc):
        raise HTTPException(401, "Refresh token is expired")
    
    user = token.user
    
    if not user.id:
        raise HTTPException(500, "User ID is missing")
    
    token.revoked = True
    session.add(token)
    session.commit()
    
    new_access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=timedelta(minutes=15)
    )
    
    new_refresh_token = create_refresh_token(user.id, session)
    
    return Token(access_token=new_access_token, refresh_token=new_refresh_token, token_type="bearer")

@app.post("/forgot-password")
async def forgot_password(user_email: UserForgotPassword, session: SessionDep):
    user_in_db = session.exec(select(User).where(User.email == user_email.email)).first()
    
    if not user_in_db:
        return {"message": "Successfully sent the email"} # to fool the hackers 😀
    
    reset_token = secrets.token_urlsafe(32)
    reset_token_exp = datetime.now() + timedelta(minutes=15)
    
    user_in_db.reset_token = reset_token
    user_in_db.reset_token_exp = reset_token_exp
    
    session.commit()
    session.refresh(user_in_db)
    
    params: resend.Emails.SendParams = {
        "from": "onboarding@resend.dev",
        "to": user_in_db.email,
        "subject": "Reset your password",
        "html":
            f"""
            <h1>Hello {user_in_db.username},</h1>
            <p>We received a request to reset your password<p>
            <a href="https://trenden.netlify.app/reset-password?token={reset_token}">Reset your password<a/>
            <strong>This link will expire in 15 minutes. If you did not request a new password, please disregard this message.</strong
            """
    }
    
    email = resend.Emails.send(params)

    return {"message": "Successfully sent the email"}
    
@app.post("/reset-password")
async def reset_password(reset_forgot_password: UserResetPassword, session: SessionDep):
    user_in_db = session.exec(select(User).where(User.reset_token == reset_forgot_password.token)).first()
    if not user_in_db:
        raise HTTPException(404, "Reset token doesn't exist")
    
    if not user_in_db.reset_token_exp:
        raise HTTPException(404, "Not Found")
    
    if user_in_db.reset_token_exp < datetime.now():
        raise HTTPException(401, "Unauthorized")
    
    user_in_db.hashed_password = hash_password(reset_forgot_password.new_password)
    user_in_db.reset_token = None
    user_in_db.reset_token_exp = None
    
    session.commit()
    session.refresh(user_in_db)
    
    return {"message": "Successfully updated user's password"}

@app.post("/workouts", response_model=WorkoutResponse)
async def post_workout(workout: WorkoutCreate, session: SessionDep, current_user = Depends(get_current_active_user)):
    
    db_workout = Workout(workout_name=workout.workout_name, date=workout.date, user=current_user)
    
    for exercise in workout.exercises:
        db_exercise = Exercise(exercise_name=exercise.exercise_name, rest_time=exercise.rest_time, workout=db_workout)
        
        for set in exercise.sets:
            db_set = SetDetails(weight=set.weight, reps=set.reps, exercise=db_exercise)
            
    session.add(db_workout)
    session.flush()
    session.commit()
    session.refresh(db_workout)
    return db_workout
    
@app.post("/templates", response_model=TemplateResponse)
async def post_template(template: TemplateCreate, session: SessionDep, current_user = Depends(get_current_active_user)):
    
    if (session.exec(select(Template).where(Template.workout_name == template.workout_name).where(Template.user == current_user))).first():
        raise HTTPException(409, "Workout Plan already exists")
    
    db_template = Template(workout_name=template.workout_name, user=current_user)
    
    for exercise in template.exercises:
        db_exercise = Exercise(exercise_name=exercise.exercise_name, rest_time=exercise.rest_time, template=db_template)
        
        for set in exercise.sets:
            db_set = SetDetails(weight=set.weight, reps=set.reps, rest_time=set.rest_time, exercise=db_exercise)
            
    session.add(db_template)
    session.flush()
    session.commit()
    session.refresh(db_template)
    return db_template

@app.get("/me", response_model=UserRead)
async def read_users_me(current_user = Depends(get_current_active_user)):
    return current_user

@app.get("/templates", response_model=list[TemplateSummary])
async def get_user_templates(current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    user_templates = session.exec(select(Template).where(Template.user == current_user)).all()
    return user_templates

@app.get("/templates/{template_id}", response_model=TemplateResponseWithAddData)
async def get_user_template(template_id: int, current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    user_template = session.exec(select(Template).where(Template.user == current_user).where(Template.id == template_id)).first()
    if not user_template:
        raise HTTPException(404, "Template doesn't exist")
    
    latest_ex_sets = []
    for exercise in user_template.exercises:
        setValues = get_exercise_sets(exercise.exercise_name, current_user, session)
        if setValues:
            latest_ex_sets.append(setValues)
            print("i'm working\n\n\n")
        
    return {"id": user_template.id, "workout_name": user_template.workout_name, "exercises": user_template.exercises, "previous_workout_data": latest_ex_sets}
    
@app.get("/workouts",response_model=list[WorkoutResponse])
async def get_user_workouts(
    current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    workout_name: Optional[str] = None,
    exercise_name: Optional[str] = None
    ):
    query = select(Workout).order_by(Workout.date.desc()).where(Workout.user == current_user) # type: ignore -- .order_by(Workout.date.desc()) type checker 😭
    
    if date_from and date_to and date_from > date_to:
        raise HTTPException(400, "date_from cannot be after date_to")
    if date_from:
        query = query.where(Workout.date >= date_from)
    if date_to:
        query = query.where(Workout.date <= date_to)
        
    if workout_name:
        query = query.where(func.lower(Workout.workout_name).contains(workout_name.lower()))
    if exercise_name:
        query = query.join(Exercise).where(func.lower(Exercise.exercise_name).contains(exercise_name.lower()))
    
    user_workouts = session.exec(query).all()
        
    return user_workouts

@app.get("/workouts/{id}", response_model=WorkoutResponse)
async def get_own_workout(id: int, current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    user_workout = session.exec(select(Workout).where(Workout.user == current_user).where(Workout.id == id)).first()
    if not user_workout:
        raise HTTPException(404, "Nonexistent")
    return user_workout 

@app.get("/analytics/{exercise_name}")
async def get_exercise_analytics(exercise_name: str, current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    
    user_exercises = session.exec(select(Exercise).where(func.lower(Exercise.exercise_name) == exercise_name.lower()).join(Workout).where(Workout.user == current_user).order_by(asc(Workout.date))).all() # type: ignore
    if not user_exercises:
        return []
    
    user_exercise_data = []
        
    for exercise in user_exercises:
        
        session_volume = 0 
        set_volume = 0
        heaviest_set = SetDetails(weight=0, reps=0)
        
        for ex_set in exercise.sets:
            session_volume += ex_set.weight * ex_set.reps
            if ex_set.weight * ex_set.reps > set_volume:
                set_volume = ex_set.weight * ex_set.reps 
            if ex_set.weight > heaviest_set.weight:
                heaviest_set = ex_set
            elif ex_set.weight == heaviest_set.weight and ex_set.reps > heaviest_set.reps:
                heaviest_set = ex_set
        
        user_exercise_data.append({
                "date": exercise.workout.date,
                "workout_name": exercise.workout.workout_name,
                "session_volume": session_volume,
                "best_set_volume": set_volume,
                "weight": heaviest_set.weight,
                "reps": heaviest_set.reps, 
                "sets": [
                    { 
                        "weight": set.weight,
                        "reps": set.reps
                    }
                        for set in exercise.sets
                    ]
            })
    
    return user_exercise_data

@app.get("/exercises/{exercise_name}")
async def get_exercise_data(exercise_name: str, current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    user_exercise_data = get_exercise_sets(exercise_name, current_user, session)
        
    return user_exercise_data   

@app.get("/recent/exercises/") 
async def get_recent_exercises(current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    user_exercises = session.exec(select(Exercise).join(Workout).where(Workout.user == current_user).order_by(desc(Workout.date)).limit(25)).all() # type: ignore
    unique_ex_names = set()
    
    user_exercises_data = []
    
    if not user_exercises:
        return []

    for unique_ex in user_exercises:
        if unique_ex.exercise_name.lower() not in unique_ex_names:
            unique_ex_names.add(unique_ex.exercise_name.lower())
            temp = {"id": unique_ex.id, "exercise_name": unique_ex.exercise_name, "rest_time": unique_ex.rest_time, "sets": []}
            for ex_set in unique_ex.sets:
                temp["sets"].append({"id": ex_set.id, "weight": ex_set.weight, "reps": ex_set.reps})
            user_exercises_data.append(temp)
        
    return user_exercises_data

@app.put("/workouts/{workout_id}", response_model=WorkoutResponse)
async def update_workout(workout_id: int, updated_workout: WorkoutCreate, current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    user_workout = get_user_workout(workout_id, current_user, session)
    
    if (user_workout is None):
        raise HTTPException(404, "Not Found")
    
    user_workout.workout_name = updated_workout.workout_name
    user_workout.date = updated_workout.date
    
    for ex in user_workout.exercises:
        session.delete(ex)

    session.commit()
    
    for updated_ex in updated_workout.exercises:
        db_exercise = Exercise(exercise_name=updated_ex.exercise_name, workout=user_workout)
        
        for updated_set in updated_ex.sets:
            db_set = SetDetails(weight=updated_set.weight, reps=updated_set.reps, exercise=db_exercise)
            
        session.add(db_exercise)

    session.flush()
    session.commit()
    session.refresh(user_workout)
    
    return user_workout

@app.patch("/templates/{template_id}")
async def update_template_values(template_id: int, updated_values: list[ExerciseCreate], current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    user_template = session.exec(select(Template).where(Template.user == current_user).where(Template.id == template_id)).first()
    
    if not user_template:
        raise HTTPException(400, "Bad Request")

    template_values = dict()
    
    for template_exercise in user_template.exercises:
        template_values[template_exercise.exercise_name.lower()] = template_exercise
    
    for exercise in updated_values:
        if exercise.exercise_name.lower() in template_values:

            template_values[exercise.exercise_name.lower()].sets = []
            
            
            for set in exercise.sets:
                db_set = SetDetails(weight=set.weight, reps=set.reps, exercise=template_values[exercise.exercise_name.lower()])
    
                session.add(db_set)      
    print(user_template.exercises)
    session.commit()
    session.refresh(user_template)    
    return user_template
    
    
@app.put("/templates/{template_id}", response_model=TemplateResponse)
async def update_template(template_id: int, updated_template: TemplateCreate, current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    user_template = session.exec(select(Template).where(Template.user == current_user).where(Template.id == template_id)).first()
    
    if not user_template:
        raise HTTPException(400, "Bad Request")
    
    user_template.workout_name = updated_template.workout_name
    
    for ex in user_template.exercises:
        session.delete(ex)
    
    session.commit()
    
    for updated_exercise in updated_template.exercises:
        db_exercise = Exercise(exercise_name=updated_exercise.exercise_name, template=user_template)
        
        for updated_set in updated_exercise.sets:
            db_set = SetDetails(weight=updated_set.weight, reps=updated_set.reps, rest_time=updated_set.rest_time, exercise=db_exercise)
            print(db_set)
        
        session.add(db_exercise)
    
    session.flush()
    session.commit()
    session.refresh(user_template)
    
    return user_template
            
@app.delete("/sets/{set_id}")
async def delete_set(set_id: int, current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    user_set = session.exec(select(SetDetails).where(SetDetails.id == set_id)).first()
    
    if not user_set:
        raise HTTPException(status_code=404, detail="Set not found")
    
    if user_set.exercise.workout.user_id != current_user.id: # type: ignore ---- typer checker is warning the "None" on workout.user_id 
        raise HTTPException(401, "Not authorized")

    session.delete(user_set)
    session.commit()
    return {"Success": True}

@app.delete("/exercises/{exercise_id}")
async def delete_exercise(exercise_id: int, current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    user_exercise = session.exec(select(Exercise).where(Exercise.id == exercise_id)).first()
    
    if not user_exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    
    if user_exercise.workout.user_id != current_user.id: # type: ignore ---- typer checker is warning the "None" on workout.user_id 
        raise HTTPException(401, "Not authorized")

    session.delete(user_exercise)
    session.commit()
    return {"Success": True}

@app.delete("/workouts/{workout_id}")
async def delete_workout(workout_id: int, current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    workout = session.exec(select(Workout).where(Workout.user == current_user).where(Workout.id == workout_id)).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    session.delete(workout)
    session.commit()
    return {"Success": True}

@app.delete("/templates/{template_id}")
async def delete_template(template_id: int, current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    template = session.exec(select(Template).where(Template.id == template_id).where(Template.user == current_user)).first()
    if not template:
        raise HTTPException(404, "Template not found")
    session.delete(template)
    session.commit()
    return {"Success": True}

@app.delete("/delete/me")
async def delete_user(deletion_conf: DeleteAccountRequest, current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    user = authenticate_user(session, current_user.username, deletion_conf.password)
    if user:
        if deletion_conf.confirmation.lower() == "yes":
            session.delete(user)
            session.commit()
            return {"Success": True}
        
        raise HTTPException(400, "Bad Request")    
    raise HTTPException(401, "Invalid Credentials")
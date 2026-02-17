
from fastapi import APIRouter, Depends, HTTPException

from sqlmodel import select

from typing import Annotated

from database import SessionDep

from models import User, Template, Exercise, SetDetails

from schemas import ExerciseCreate, TemplateCreate, TemplateResponse, TemplateSummary, TemplateResponseWithAddData

from auth_utils import get_current_active_user

from queries import get_exercise_sets

router = APIRouter()

@router.post("", response_model=TemplateResponse)
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

@router.get("", response_model=list[TemplateSummary])
async def get_user_templates(current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    user_templates = session.exec(select(Template).where(Template.user == current_user)).all()
    return user_templates

@router.get("/{template_id}", response_model=TemplateResponseWithAddData)
async def get_user_template(template_id: int, current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    user_template = session.exec(select(Template).where(Template.user == current_user).where(Template.id == template_id)).first()
    if not user_template:
        raise HTTPException(404, "Template doesn't exist")
    
    latest_ex_sets = []
    for exercise in user_template.exercises:
        setValues = get_exercise_sets(exercise.exercise_name, current_user, session)
        if setValues:
            latest_ex_sets.append(setValues)
        
    return {"id": user_template.id, "workout_name": user_template.workout_name, "exercises": user_template.exercises, "previous_workout_data": latest_ex_sets}
    
@router.patch("/{template_id}")
async def update_template_values(template_id: int, updated_values: list[ExerciseCreate], current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    user_template = session.exec(select(Template).where(Template.user == current_user).where(Template.id == template_id)).first()
    
    if not user_template:
        raise HTTPException(400, "Bad Request")

    template_values = dict() # faster look ups O(1) instead of list O(n)
    
    for template_exercise in user_template.exercises:
        template_values[template_exercise.exercise_name.lower()] = template_exercise
    
    for exercise in updated_values:
        if exercise.exercise_name.lower() in template_values:
            
            # Clear sets since they are about to be replaced by the ones from updated_values
            template_values[exercise.exercise_name.lower()].sets = [] 
            
            for set in exercise.sets:
                db_set = SetDetails(weight=set.weight, reps=set.reps, rest_time=set.rest_time, exercise=template_values[exercise.exercise_name.lower()])
    
                session.add(db_set)      
                
    session.commit()
    session.refresh(user_template)    
    return user_template

@router.put("/{template_id}", response_model=TemplateResponse)
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
        
        session.add(db_exercise)
    
    session.flush()
    session.commit()
    session.refresh(user_template)
    
    return user_template

@router.delete("/{template_id}")
async def delete_template(template_id: int, current_user: Annotated[User, Depends(get_current_active_user)], session: SessionDep):
    template = session.exec(select(Template).where(Template.id == template_id).where(Template.user == current_user)).first()
    if not template:
        raise HTTPException(404, "Template not found")
    session.delete(template)
    session.commit()
    return {"Success": True}
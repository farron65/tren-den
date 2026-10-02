from fastapi import APIRouter, Depends, HTTPException

from auth_utils import verify_bot_key, get_user

from schemas import ImportRequest, WorkoutCreate, WorkoutResponse
from database import SessionDep

from config import BOT_USERNAME

from pydantic import ValidationError

from services.strong_parser import parse_strong, ImportParseError
from queries import create_workout

router = APIRouter()

@router.post("/strong", dependencies=[Depends(verify_bot_key)], response_model=WorkoutResponse)
async def import_strong(body: ImportRequest, session: SessionDep):
    user = get_user(session, username=BOT_USERNAME)
    if not user:
        raise HTTPException(500, "Bot user not found. Check BOT_USERNAME.")
    
    try:
        new_workout = WorkoutCreate(**parse_strong(body.text))
    except ImportParseError as e:
        raise HTTPException(422, str(e))
    except ValidationError:
        raise HTTPException(422, "Workout failed validation (check weights and reps).")
    
    workout = create_workout(new_workout, user, session)
    return workout
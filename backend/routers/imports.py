from fastapi import APIRouter, Depends, HTTPException

from auth_utils import verify_bot_key

from schemas import ImportRequest

router = APIRouter()

@router.post("/strong", dependencies=[Depends(verify_bot_key)])
async def import_strong(body: ImportRequest):
    return {"received": len(body.text)}
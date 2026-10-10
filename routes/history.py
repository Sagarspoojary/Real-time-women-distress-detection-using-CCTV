from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from database.database import get_db
from database import crud
from database import schemas

router = APIRouter()

@router.get("/history")
async def get_history(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    incidents = crud.get_incidents(db, skip=skip, limit=limit)
    return [i.to_frontend_dict() for i in incidents]

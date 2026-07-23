from fastapi import APIRouter, HTTPException, Path, Body
from typing import List
from pydantic import BaseModel
from services.emergency_contact_service import EmergencyContactService

router = APIRouter()
service = EmergencyContactService()

class ContactsPayload(BaseModel):
    contacts: List[str]

class ContactUpdatePayload(BaseModel):
    email: str

@router.get("/emergency-contacts")
async def get_contacts():
    try:
        contacts = service.load_contacts()
        return {"contacts": contacts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/emergency-contacts")
async def post_contacts(payload: ContactsPayload):
    try:
        updated = service.set_contacts(payload.contacts)
        return {"contacts": updated}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/emergency-contacts/{index}")
async def put_contact(
    index: int = Path(..., description="Index of contact (0-3)", ge=0, le=3),
    payload: ContactUpdatePayload = Body(...)
):
    try:
        updated = service.update_contact(index, payload.email)
        return {"contacts": updated}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except IndexError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/emergency-contacts/{index}")
async def delete_contact(
    index: int = Path(..., description="Index of contact (0-3)", ge=0, le=3)
):
    try:
        updated = service.delete_contact(index)
        return {"contacts": updated}
    except IndexError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

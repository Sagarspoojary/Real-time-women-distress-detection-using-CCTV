from fastapi import APIRouter, HTTPException, Path, Body
from typing import List, Optional, Union, Dict, Any
from pydantic import BaseModel
from services.emergency_contact_service import EmergencyContactService

router = APIRouter()
service = EmergencyContactService()


class ContactUpdatePayload(BaseModel):
    name: Optional[str] = "Emergency Contact"
    email: Optional[str] = ""
    phone: Optional[str] = ""
    enabled: Optional[bool] = True


@router.get("/emergency-contacts")
async def get_contacts():
    try:
        contacts = service.load_contacts()
        return {"contacts": contacts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/emergency-contacts/{index}")
async def put_contact(
    index: int = Path(..., description="Index of contact (0-3)", ge=0, le=3),
    payload: Union[ContactUpdatePayload, Dict[str, Any]] = Body(...)
):
    try:
        data = payload.dict() if hasattr(payload, "dict") else payload
        # If payload was simple legacy {"email": "..."}, handle gracefully
        if "email" in data and len(data) == 1:
            data = {"email": data["email"], "phone": "", "enabled": True}
            
        updated = service.update_contact(index, data)
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

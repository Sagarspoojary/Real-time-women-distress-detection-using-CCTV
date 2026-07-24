"""
routes/location.py
===================
API Endpoint for receiving live browser geolocation updates.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.location_service import LocationService

router = APIRouter()
location_service = LocationService()

class LocationPayload(BaseModel):
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    timestamp: Optional[str] = None

@router.post("/location")
async def update_location(payload: LocationPayload):
    try:
        updated = location_service.update_location(
            latitude=payload.latitude,
            longitude=payload.longitude,
            accuracy=payload.accuracy,
            timestamp=payload.timestamp
        )
        return {"status": "success", "data": updated}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update location: {e}")

@router.get("/location")
async def get_location():
    return {"status": "success", "data": location_service.get_location()}

from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class IncidentResponse(BaseModel):
    id: str
    videoName: str
    timestamp: str
    status: Optional[str] = None
    model1: Optional[Dict[str, Any]] = None
    model2: Optional[Dict[str, Any]] = None
    model3: Optional[Dict[str, Any]] = None
    persons: Optional[List[Dict[str, Any]]] = None
    emailSent: Optional[str] = None
    location: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

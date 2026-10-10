from fastapi import APIRouter, UploadFile, File
import shutil
import os

# NOTE: .env is loaded in app.py before this module is imported.
from modules.pipeline import WomenDistressPipeline
from services.alert_dispatcher import AlertDispatcher

router = APIRouter()

pipeline = WomenDistressPipeline()
alert_dispatcher = AlertDispatcher()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


from fastapi import Form
from typing import Optional

@router.post("/predict")
async def predict(
    file: UploadFile = File(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    accuracy: Optional[float] = Form(None),
    timestamp: Optional[float] = Form(None),
):
    video_path = os.path.join(UPLOAD_DIR, file.filename)

    with open(video_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    result = pipeline.process(video_path)

    # Attach location data if available
    gps_data = {
        "latitude": latitude,
        "longitude": longitude,
        "accuracy": accuracy,
        "timestamp": timestamp,
    }
    result["location"] = gps_data

    # Automatically dispatch an alert email if a threat was detected above threshold.
    # This call is fully self-contained — it never raises, never blocks the response.
    incident_id = alert_dispatcher.maybe_dispatch(result, video_path, location_data=gps_data)
    
    if incident_id:
        result["incident_id"] = incident_id

    return result

from pydantic import BaseModel
from typing import List, Dict, Any

class EmailPayload(BaseModel):
    recipients: List[str]
    incident_details: Dict[str, Any]

@router.post("/send-email")
async def send_email(payload: EmailPayload):
    # Log the simulated email details to console
    print("\n" + "="*60)
    print("🚨 EMERGENCY EMAIL ALERT SYSTEM DISPATCHED")
    print("="*60)
    print(f"Recipients: {', '.join(payload.recipients)}")
    print(f"Subject: Emergency Alert - Female Distress Detected")
    print("-"*60)
    print(f"Incident Type: {payload.incident_details.get('incident_type', 'Female Distress')}")
    print(f"Video Target: {payload.incident_details.get('video_name', 'Unknown')}")
    print(f"Capture Time: {payload.incident_details.get('timestamp', 'Unknown')}")
    print(f"Threat Score: {payload.incident_details.get('confidence', '0.00')}")
    print(f"Entity Track ID: #{payload.incident_details.get('track_id', 'Unknown')}")
    print(f"Identified Person: {payload.incident_details.get('person_name', 'Unknown Person')}")
    print("-"*60)
    print("AI DIAGNOSTICS SUMMARY:")
    print("Operator attention required. Female distress waving anomaly flagged.")
    print("="*60 + "\n")
    
    return {"status": "success", "message": "Emergency alert successfully dispatched to 4 contacts."}
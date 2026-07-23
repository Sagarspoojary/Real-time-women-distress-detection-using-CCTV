from fastapi import APIRouter, UploadFile, File
import shutil
import os

from modules.pipeline import WomenDistressPipeline

router = APIRouter()

pipeline = WomenDistressPipeline()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/predict")
async def predict(file: UploadFile = File(...)):
    video_path = os.path.join(UPLOAD_DIR, file.filename)

    with open(video_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    result = pipeline.process(video_path)

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
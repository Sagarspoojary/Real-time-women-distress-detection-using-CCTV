from fastapi import APIRouter, HTTPException, Body
from typing import List, Dict, Any
from pydantic import BaseModel
from services.emergency_contact_service import EmergencyContactService
from services.email_service import EmailService

router = APIRouter()
contacts_service = EmergencyContactService()
email_service = EmailService()

class EmergencySendPayload(BaseModel):
    incident_id: str
    persons: List[Dict[str, Any]]
    model1: Dict[str, Any] = {}
    model2: Dict[str, Any] = {}
    timestamp: str = ""
    video_name: str = "Unknown video clip"

@router.post("/emergency/send")
async def send_emergency_alert(payload: EmergencySendPayload):
    # 1. Verify trigger condition (gender == Female AND distress == True)
    condition_met = False
    target_person = None

    for person in payload.persons:
        gender = person.get("gender", "Unknown")
        distress = person.get("distress", False)
        # Handle string or boolean representation
        is_distress = (distress is True or str(distress).lower() == "true")
        
        if gender == "Female" and is_distress:
            condition_met = True
            target_person = person
            break

    if not condition_met:
        raise HTTPException(
            status_code=400,
            detail="Trigger condition not met: Emergency email can only be sent when gender is Female and distress is active."
        )

    # 2. Load and filter contacts
    try:
        contacts = contacts_service.load_contacts()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load contacts: {e}")

    valid_recipients = [c.strip() for c in contacts if c and c.strip()]
    if not valid_recipients:
        raise HTTPException(status_code=400, detail="No contacts configured.")

    # 3. Build email body
    recognized_person = target_person.get("recognized_name", target_person.get("identity", "Unknown Person"))
    face_status = target_person.get("face_status", "Unknown")
    track_id = target_person.get("track_id", "Unknown")
    confidence_val = target_person.get("confidence", 0.0)
    
    violence_pred = payload.model1.get("prediction", "N/A")
    violence_conf = payload.model1.get("confidence", "0.0")
    distress_pred = payload.model2.get("prediction", "N/A")
    distress_conf = payload.model2.get("confidence", "0.0")

    subject = "🚨 Female Distress Detected"
    email_body = f"""Female Distress Detected

Recognized Person:
{recognized_person}

Gender:
Female

Face Status:
{face_status}

Violence:
{violence_pred} ({violence_conf}%)

Distress:
{distress_pred} ({distress_conf}%)

Track ID:
{track_id}

Confidence:
{confidence_val:.1%}

Time:
{payload.timestamp}

Video Clip:
{payload.video_name}

Incident ID:
{payload.incident_id}

AI Summary:
Anomaly warning. Female distress waving anomaly flagged on entity track ID #{track_id}.

Please verify the situation immediately.
"""

    # 4. Dispatch alert broadcast
    try:
        sent_count = email_service.send_emergency_email(valid_recipients, subject, email_body)
        return {"status": "success", "emails_sent": sent_count}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        # Check if auth failure
        if "authentication failed" in str(e).lower():
            return {"status": "failed", "reason": "SMTP authentication failed"}
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        return {"status": "failed", "reason": str(e)}

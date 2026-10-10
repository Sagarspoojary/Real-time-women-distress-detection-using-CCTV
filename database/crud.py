from sqlalchemy.orm import Session
import json
from . import models
import logging

logger = logging.getLogger("database.crud")

def create_incident(db: Session, incident_id: str, source: str, pipeline_result: dict, video_path: str = None, snapshot_path: str = None, location_data: dict = None, alert_status: str = None):
    # Only create if it doesn't exist
    existing = db.query(models.Incident).filter(models.Incident.id == incident_id).first()
    if existing:
        return existing

    status = pipeline_result.get("status")
    model1 = pipeline_result.get("model1", {})
    threat_type = model1.get("prediction")
    confidence = model1.get("confidence")
    
    lat = location_data.get("latitude") if location_data else None
    lon = location_data.get("longitude") if location_data else None
    
    # Store complete result for frontend history parsing
    raw_payload = json.dumps(pipeline_result)
    
    db_incident = models.Incident(
        id=incident_id,
        source=source,
        status=status,
        threat_type=threat_type,
        confidence=confidence,
        risk_level="CRITICAL" if threat_type in ["Violence", "Assault", "Punching", "SOS"] else "NORMAL",
        latitude=lat,
        longitude=lon,
        video_path=video_path,
        snapshot_path=snapshot_path,
        alert_status=alert_status,
        raw_payload=raw_payload
    )
    
    try:
        db.add(db_incident)
        db.commit()
        db.refresh(db_incident)
        logger.info(f"[DB] Persisted incident {incident_id} to database.")
    except Exception as e:
        db.rollback()
        logger.error(f"[DB] Failed to persist incident {incident_id}: {e}")
        
    return db_incident

def update_alert_status(db: Session, incident_id: str, status: str):
    incident = db.query(models.Incident).filter(models.Incident.id == incident_id).first()
    if incident:
        incident.alert_status = status
        db.commit()
        db.refresh(incident)
    return incident

def get_incidents(db: Session, skip: int = 0, limit: int = 50):
    return db.query(models.Incident).order_by(models.Incident.timestamp.desc()).offset(skip).limit(limit).all()

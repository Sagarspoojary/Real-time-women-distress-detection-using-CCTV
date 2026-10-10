from sqlalchemy import Column, String, Float, Integer, Text, DateTime
import datetime
import json
from .database import Base

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String, primary_key=True, index=True)
    timestamp = Column(String, default=lambda: datetime.datetime.now().isoformat())
    source = Column(String, nullable=True) # e.g. "WEBCAM-01" or manual upload filename
    
    status = Column(String, nullable=True) # "Distress Detected" etc.
    threat_type = Column(String, nullable=True) # "Violence", "Assault"
    confidence = Column(Float, nullable=True)
    risk_level = Column(String, nullable=True) # "CRITICAL"
    
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    video_path = Column(String, nullable=True)
    snapshot_path = Column(String, nullable=True)
    
    alert_status = Column(String, nullable=True) # "SENT"
    
    # Store the entire raw JSON payload to ensure 100% compatibility with frontend 
    # History.tsx without complex relational tables.
    raw_payload = Column(Text, nullable=True)

    def to_frontend_dict(self):
        """Converts the model to the exact dictionary format expected by the frontend History UI."""
        if self.raw_payload:
            try:
                data = json.loads(self.raw_payload)
                # Overwrite ID and timestamp just in case
                data["id"] = self.id
                data["timestamp"] = self.timestamp
                data["videoName"] = self.source or data.get("videoName", "Unknown")
                data["emailSent"] = "Yes" if self.alert_status in ("SENT", "SUCCESS") else "No"
                return data
            except:
                pass
                
        # Fallback if raw_payload is missing
        return {
            "id": self.id,
            "videoName": self.source or "Unknown",
            "timestamp": self.timestamp,
            "status": self.status,
            "model1": {"prediction": self.threat_type or "Unknown", "confidence": self.confidence or 0.0},
            "location": {"latitude": self.latitude, "longitude": self.longitude} if self.latitude is not None else None,
            "emailSent": "Yes" if self.alert_status in ("SENT", "SUCCESS") else "No"
        }

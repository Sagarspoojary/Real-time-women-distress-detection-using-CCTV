import unittest
from unittest.mock import patch, MagicMock
import os
import json

os.environ["TESTING"] = "1"

from fastapi.testclient import TestClient
from database.database import Base, get_db, engine, SessionLocal
from database import models
from app import app
from services.alert_dispatcher import AlertDispatcher

def override_get_db():
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

class TestHistoryPersistence(unittest.TestCase):
    def setUp(self):
        import database.models
        Base.metadata.create_all(bind=engine)
        self.client = TestClient(app)
        
    def tearDown(self):
        Base.metadata.drop_all(bind=engine)
        
    def test_history_api_empty(self):
        response = self.client.get("/api/v1/history")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

    @patch("services.email_service.EmailService.send_alert_email")
    def test_alert_dispatcher_persists_incident(self, mock_email):
        mock_email.return_value = 1
        dispatcher = AlertDispatcher()
        
        # Override cooldown for isolated tests
        dispatcher._cooldown_registry.clear()
        
        pipeline_result = {
            "status": "Success",
            "model1": {"prediction": "Assault", "confidence": 98.0},
            "model2": {"prediction": "Normal", "confidence": 10.0},
            "persons": []
        }
        
        incident_id = dispatcher.maybe_dispatch(pipeline_result, "test_video.mp4")
        self.assertIsNotNone(incident_id)
        
        # Worker thread executes asynchronously, wait briefly
        import time
        time.sleep(0.5)
        
        db = SessionLocal()
        incident = db.query(models.Incident).filter(models.Incident.id == incident_id).first()
        self.assertIsNotNone(incident)
        self.assertEqual(incident.threat_type, "Assault")
        db.close()
        
        response = self.client.get("/api/v1/history")
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["id"], incident_id)
        self.assertEqual(data[0]["model1"]["prediction"], "Assault")

    @patch("services.email_service.EmailService.send_alert_email")
    def test_alert_dispatcher_deduplicates(self, mock_email):
        mock_email.return_value = 1
        dispatcher = AlertDispatcher()
        # Ensure fresh registry
        dispatcher._cooldown_registry.clear()
        
        pipeline_result = {
            "status": "Success",
            "model1": {"prediction": "Assault", "confidence": 98.0},
        }
        
        id1 = dispatcher.maybe_dispatch(pipeline_result, "test_camera.mp4")
        id2 = dispatcher.maybe_dispatch(pipeline_result, "test_camera.mp4")
        
        self.assertIsNotNone(id1)
        self.assertIsNone(id2)  # Cooldown active!
        
        import time
        time.sleep(0.5)
        
        db = SessionLocal()
        incidents = db.query(models.Incident).all()
        self.assertEqual(len(incidents), 1)
        db.close()
        
    @patch("services.email_service.EmailService.send_alert_email")
    def test_normal_classification_does_not_persist(self, mock_email):
        dispatcher = AlertDispatcher()
        dispatcher._cooldown_registry.clear()
        
        pipeline_result = {
            "status": "Success",
            "model1": {"prediction": "Normal", "confidence": 90.0},
        }
        
        incident_id = dispatcher.maybe_dispatch(pipeline_result, "test.mp4")
        self.assertIsNone(incident_id)
        
        db = SessionLocal()
        self.assertEqual(db.query(models.Incident).count(), 0)
        db.close()

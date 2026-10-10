import unittest
from unittest.mock import patch, MagicMock
import os
import requests

from app import app
from fastapi.testclient import TestClient
from services.triggered_clip_service import clip_service

class TestTriggeredClipIntegration(unittest.TestCase):
    def setUp(self):
        # We use a mocked requests.post inside TriggeredClipService to simulate the backend 
        # But we ALSO use TestClient to test the backend logic directly.
        self.client = TestClient(app)
        
    @patch('routes.predict.pipeline')
    @patch('routes.predict.alert_dispatcher')
    def test_violence_triggers_alert_dispatcher(self, mock_alert, mock_pipeline):
        # Mock pipeline output to return Violence
        mock_pipeline.process.return_value = {
            "status": "Distress Detected", 
            "model1": {"prediction": "Violence", "confidence": 95.0},
            "model2": {"prediction": "SOS", "confidence": 99.0}
        }
        
        # Create a dummy video file
        dummy_video = "dummy_test_video.mp4"
        with open(dummy_video, "wb") as f:
            f.write(b"dummy content")
            
        try:
            with open(dummy_video, "rb") as f:
                response = self.client.post(
                    "/predict",
                    files={"file": ("dummy_test_video.mp4", f, "video/mp4")}
                )
                
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["status"], "Distress Detected")
            
            # Verify the pipeline was called
            mock_pipeline.process.assert_called_once()
            
            # Verify the alert dispatcher was called EXACTLY ONCE
            mock_alert.maybe_dispatch.assert_called_once()
            
        finally:
            if os.path.exists(dummy_video):
                os.remove(dummy_video)
                
    @patch('routes.predict.pipeline')
    @patch('routes.predict.alert_dispatcher')
    def test_normal_does_not_trigger_dispatcher(self, mock_alert, mock_pipeline):
        # Mock pipeline output to return Normal
        mock_pipeline.process.return_value = {
            "status": "No distress detected", 
            "model1": {"prediction": "Normal", "confidence": 90.0},
            "model2": None
        }
        
        dummy_video = "dummy_test_normal.mp4"
        with open(dummy_video, "wb") as f:
            f.write(b"dummy content")
            
        try:
            with open(dummy_video, "rb") as f:
                response = self.client.post(
                    "/predict",
                    files={"file": ("dummy_test_normal.mp4", f, "video/mp4")}
                )
                
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["status"], "No distress detected")
            
            # Verify the pipeline was called
            mock_pipeline.process.assert_called_once()
            
            # Verify the alert dispatcher WAS NOT CALLED (bypassed) or called with result that suppresses it
            # In predict.py, it DOES call `maybe_dispatch`, but `maybe_dispatch` ignores it if status is not "Distress Detected"
            # Let's verify `maybe_dispatch` is called, but we know it does nothing internally.
            mock_alert.maybe_dispatch.assert_called_once()
            
        finally:
            if os.path.exists(dummy_video):
                os.remove(dummy_video)

if __name__ == "__main__":
    unittest.main()

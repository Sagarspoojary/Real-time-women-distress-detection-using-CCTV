import unittest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
import os

from app import app
from services.triggered_clip_service import TriggeredClipService

class TestTriggeredClipUpload(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.service = TriggeredClipService()
        self.service.api_url = "/predict"

    @patch('routes.predict.pipeline')
    @patch('routes.predict.alert_dispatcher')
    def test_upload_route_invokes_analysis(self, mock_alert, mock_pipeline):
        # Mock pipeline output
        mock_pipeline.process.return_value = {"status": "Distress Detected", "model1": {"prediction": "Violence"}}
        
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
            
            # Verify the alert dispatcher was called
            mock_alert.maybe_dispatch.assert_called_once()
            
        finally:
            if os.path.exists(dummy_video):
                os.remove(dummy_video)

if __name__ == "__main__":
    unittest.main()

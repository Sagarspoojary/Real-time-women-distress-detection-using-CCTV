import unittest
from unittest.mock import patch, MagicMock
import os
from modules.location_provider import LocationProvider

class TestLocationIntegration(unittest.TestCase):
    
    @patch.dict(os.environ, {"SAFETY_LOCATION_LAT": "12.9716", "SAFETY_LOCATION_LON": "77.5946", "SAFETY_LOCATION_NAME": "Bangalore"})
    def test_valid_coordinates(self):
        provider = LocationProvider()
        data = provider.get_location_data()
        self.assertTrue(provider.is_configured)
        self.assertEqual(data["latitude"], 12.9716)
        self.assertEqual(data["longitude"], 77.5946)
        self.assertEqual(data["name"], "Bangalore")
        self.assertIsNone(data["accuracy"])

    @patch.dict(os.environ, {"SAFETY_LOCATION_LAT": "invalid", "SAFETY_LOCATION_LON": "77.5946"})
    def test_invalid_coordinates(self):
        provider = LocationProvider()
        data = provider.get_location_data()
        self.assertFalse(provider.is_configured)
        self.assertIsNone(data["latitude"])

    @patch.dict(os.environ, {"SAFETY_LOCATION_LAT": "190.0", "SAFETY_LOCATION_LON": "77.5946"})
    def test_out_of_bounds_coordinates(self):
        provider = LocationProvider()
        data = provider.get_location_data()
        self.assertFalse(provider.is_configured)
        self.assertIsNone(data["latitude"])

    @patch.dict(os.environ, {}, clear=True)
    def test_missing_coordinates(self):
        provider = LocationProvider()
        data = provider.get_location_data()
        self.assertFalse(provider.is_configured)
        self.assertIsNone(data["latitude"])

    @patch("services.email_service.EmailService.send_alert_email")
    @patch("services.sms_service.SMSService.send_sms")
    def test_email_sms_formatting_with_location(self, mock_sms, mock_email):
        from services.alert_dispatcher import AlertDispatcher
        dispatcher = AlertDispatcher()
        dispatcher._dispatched_ids.clear()
        dispatcher._cooldown_registry.clear()
        
        # Test with location
        pipeline_result = {
            "status": "Distress Detected",
            "model1": {"prediction": "Violence", "confidence": 95.0},
            "model2": {"prediction": "SOS", "confidence": 90.0}
        }
        loc_data = {"latitude": 12.9716, "longitude": 77.5946, "accuracy": 15.0}
        
        with patch.dict(os.environ, {"ENABLE_SMS_ALERTS": "true"}):
            dispatcher.maybe_dispatch(pipeline_result, "test_loc.mp4", location_data=loc_data)
            
            # Allow thread to process
            import time
            time.sleep(0.5)
            
            self.assertTrue(mock_email.called)
            html_body = mock_email.call_args[1]["html_body"]
            self.assertIn("Lat: 12.971600, Lng: 77.594600 (±15.0m)", html_body)
            self.assertIn("https://www.google.com/maps?q=12.9716,77.5946", html_body)
            
            if mock_sms.called:
                sms_text = mock_sms.call_args[0][0]
                self.assertIn("https://www.google.com/maps?q=12.9716,77.5946", sms_text)

    @patch("services.email_service.EmailService.send_alert_email")
    def test_email_formatting_without_location(self, mock_email):
        from services.alert_dispatcher import AlertDispatcher
        dispatcher = AlertDispatcher()
        dispatcher._cooldown_registry.clear()
        
        pipeline_result = {
            "status": "Distress Detected",
            "model1": {"prediction": "Assault", "confidence": 99.0}
        }
        
        dispatcher.maybe_dispatch(pipeline_result, "test_noloc.mp4", location_data={"latitude": None, "longitude": None})
        
        import time
        time.sleep(0.5)
        
        self.assertTrue(mock_email.called)
        html_body = mock_email.call_args[1]["html_body"]
        self.assertIn("N/A", html_body)

    @patch("services.email_service.EmailService.send_alert_email")
    def test_no_incident_for_normal_classification(self, mock_email):
        from services.alert_dispatcher import AlertDispatcher
        dispatcher = AlertDispatcher()
        dispatcher._cooldown_registry.clear()
        
        pipeline_result = {
            "status": "No distress detected",
            "model1": {"prediction": "Normal", "confidence": 90.0}
        }
        
        dispatcher.maybe_dispatch(pipeline_result, "test_normal.mp4")
        
        import time
        time.sleep(0.5)
        
        self.assertFalse(mock_email.called)

    @patch("services.email_service.EmailService.send_alert_email")
    def test_deduplication_cooldown_unchanged(self, mock_email):
        from services.alert_dispatcher import AlertDispatcher
        dispatcher = AlertDispatcher()
        dispatcher._cooldown_registry.clear()
        
        pipeline_result = {
            "status": "Distress Detected",
            "model1": {"prediction": "Violence", "confidence": 95.0}
        }
        
        # Dispatch 1 (should send)
        dispatcher.maybe_dispatch(pipeline_result, "test_cooldown.mp4")
        
        # Dispatch 2 immediately (should be suppressed by cooldown)
        dispatcher.maybe_dispatch(pipeline_result, "test_cooldown.mp4")
        
        import time
        time.sleep(0.5)
        
        # Should only be called once
        self.assertEqual(mock_email.call_count, 1)

    @patch("modules.location_provider.LocationProvider.get_location_data")
    @patch("services.alert_dispatcher.AlertDispatcher.maybe_dispatch")
    def test_live_camera_passes_coordinates(self, mock_dispatch, mock_get_loc):
        # Configured coordinates reach the dispatcher for a confirmed live-camera incident.
        mock_get_loc.return_value = {"latitude": 10.0, "longitude": 20.0, "accuracy": None, "name": "Test"}
        
        from modules.webcam_stream_processor import WebcamStreamProcessor
        import os
        processor = WebcamStreamProcessor()
        
        # Mock dependencies
        processor._recorder = MagicMock()
        processor._recorder.save_evidence.return_value = ("mock_vid.mp4", "mock_snap.jpg")
        processor._pipeline = MagicMock()
        processor._pipeline.process_videomae.return_value = {
            "model1": {"prediction": "Violence", "confidence": 95.0},
            "model2": {"prediction": "Normal", "confidence": 0.0}
        }
        
        # Advance state to trigger confirmation
        processor._consecutive_threats = int(os.environ.get("VIOLENCE_CONFIRMATION_COUNT", "2"))
        
        # Run the internal threat handler
        processor._run_inference_async([])
        
        self.assertTrue(mock_dispatch.called)
        kwargs = mock_dispatch.call_args[1]
        self.assertIn("location_data", kwargs)
        self.assertEqual(kwargs["location_data"]["latitude"], 10.0)

    @patch("requests.post")
    @patch("modules.location_provider.LocationProvider.get_location_data")
    def test_triggered_clip_passes_coordinates(self, mock_get_loc, mock_post):
        # Configured coordinates from a triggered clip reach the dispatcher through /predict.
        mock_get_loc.return_value = {"latitude": 10.0, "longitude": 20.0, "accuracy": None, "name": "Test"}
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {"status": "Success"}
        
        from services.triggered_clip_service import TriggeredClipService
        service = TriggeredClipService()
        
        # Create a dummy file to upload
        import tempfile
        import os
        fd, path = tempfile.mkstemp(suffix=".mp4")
        os.write(fd, b"mock video data")
        os.close(fd)
        
        try:
            service._upload_clip_worker(path)
            self.assertTrue(mock_post.called)
            kwargs = mock_post.call_args[1]
            self.assertIn("data", kwargs)
            self.assertEqual(kwargs["data"]["latitude"], 10.0)
            self.assertEqual(kwargs["data"]["longitude"], 20.0)
        finally:
            os.remove(path)

    @patch("modules.pipeline.WomenDistressPipeline.process")
    @patch("services.alert_dispatcher.AlertDispatcher.maybe_dispatch")
    def test_manual_upload_preserves_behavior(self, mock_dispatch, mock_pipeline):
        # Existing manual uploads still behave as before
        mock_pipeline.return_value = {"status": "Success", "model1": {"prediction": "Normal", "confidence": 99.0}}
        from fastapi.testclient import TestClient
        from app import app
        client = TestClient(app)
        
        # Create a dummy file
        import tempfile
        import os
        fd, path = tempfile.mkstemp(suffix=".mp4")
        os.write(fd, b"mock video data")
        os.close(fd)
        
        try:
            with open(path, "rb") as f:
                response = client.post("/predict", files={"file": ("test.mp4", f, "video/mp4")})
            
            # Request should succeed
            self.assertEqual(response.status_code, 200)
            
            # The maybe_dispatch should have been called
            self.assertTrue(mock_dispatch.called)
            
            # Since we didn't pass location, the kwargs shouldn't have location_data, or it should be None/empty
            kwargs = mock_dispatch.call_args[1]
            if "location_data" in kwargs:
                self.assertIsNone(kwargs["location_data"].get("latitude"))
        finally:
            os.remove(path)


if __name__ == "__main__":
    unittest.main()

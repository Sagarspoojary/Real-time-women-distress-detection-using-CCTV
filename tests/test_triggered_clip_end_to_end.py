import os
import time
import unittest
import numpy as np
import cv2
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app import app
from modules.triggered_clip_recorder import TriggeredClipRecorder, TRIGGERED_CLIPS_DIR
from services.triggered_clip_service import TriggeredClipService
from modules.webcam_stream_processor import WebcamStreamProcessor
from services.alert_dispatcher import AlertDispatcher

class TestTriggeredClipAudit(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        os.makedirs("scratch", exist_ok=True)
        cls.valid_test_mp4 = "scratch/test_stage_a.mp4"
        # Generate a verified 20-frame valid MP4
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        out = cv2.VideoWriter(cls.valid_test_mp4, fourcc, 15.0, (640, 480))
        for i in range(20):
            frame = np.full((480, 640, 3), (i * 10) % 255, dtype=np.uint8)
            out.write(frame)
        out.release()

    @classmethod
    def tearDownClass(cls):
        if os.path.exists(cls.valid_test_mp4):
            try:
                os.remove(cls.valid_test_mp4)
            except Exception:
                pass

    def test_stage_a_mp4_validation(self):
        """Stage A: Verify valid local MP4 can be opened and decoded."""
        self.assertTrue(os.path.exists(self.valid_test_mp4))
        self.assertGreater(os.path.getsize(self.valid_test_mp4), 0)

        cap = cv2.VideoCapture(self.valid_test_mp4)
        self.assertTrue(cap.isOpened(), "VideoCapture must successfully open the MP4")
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        self.assertEqual(frame_count, 20)
        self.assertEqual(w, 640)
        self.assertEqual(h, 480)

        decoded_count = 0
        while True:
            ret, frame = cap.read()
            if not ret or frame is None:
                break
            decoded_count += 1
        cap.release()
        self.assertEqual(decoded_count, 20, "All 20 frames must be decodable")

    @patch("routes.predict.pipeline")
    @patch("routes.predict.alert_dispatcher")
    def test_stage_b_predict_upload_format(self, mock_dispatcher, mock_pipeline):
        """Stage B: Upload MP4 directly to existing /predict endpoint via multipart/form-data."""
        mock_pipeline.process.return_value = {
            "status": "No distress detected",
            "model1": {"prediction": "Normal", "confidence": 98.5},
            "model2": None,
            "model3": {"people_detected": 1, "frames_processed": 20},
            "persons": []
        }
        mock_dispatcher.maybe_dispatch.return_value = None

        client = TestClient(app)
        with open(self.valid_test_mp4, "rb") as f:
            response = client.post(
                "/predict",
                files={"file": ("test_stage_a.mp4", f, "video/mp4")},
                data={"latitude": "12.9716", "longitude": "77.5946", "accuracy": "10.0"}
            )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "No distress detected")
        self.assertEqual(data["model1"]["prediction"], "Normal")
        self.assertEqual(data["location"]["latitude"], 12.9716)
        mock_pipeline.process.assert_called_once()
        mock_dispatcher.maybe_dispatch.assert_called_once()

    @patch("requests.post")
    def test_stage_c_triggered_clip_service_invocation(self, mock_requests_post):
        """Stage C: Invoke TriggeredClipService and verify backend receives and analyzes it."""
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "status": "Distress Detected",
            "model1": {"prediction": "Violence", "confidence": 88.0},
            "model2": {"prediction": "Punching", "confidence": 85.0},
            "model3": {"people_detected": 2},
            "incident_id": "INC-TEST-12345"
        }
        mock_requests_post.return_value = mock_resp

        service = TriggeredClipService()
        # Direct synchronous call to worker to verify execution
        service._upload_clip_worker(self.valid_test_mp4, job_id="test_job", source="WEBCAM-01")

        mock_requests_post.assert_called_once()
        args, kwargs = mock_requests_post.call_args
        self.assertIn("files", kwargs)
        self.assertIn("file", kwargs["files"])
        self.assertEqual(kwargs["files"]["file"][0], "test_stage_a.mp4")
        self.assertEqual(kwargs["timeout"], 120.0)

    @patch("requests.post")
    def test_stage_d_error_visibility_and_logging(self, mock_requests_post):
        """Stage D: Test unreachable backend, missing file, 0-byte file, and rejected request."""
        import requests
        service = TriggeredClipService()

        # 1. Missing file
        with self.assertLogs("triggered_clip_service", level="ERROR") as cm:
            service._upload_clip_worker("scratch/non_existent_clip_123.mp4", job_id="missing_job")
            self.assertTrue(any("Video file not found" in msg for msg in cm.output))

        # 2. Empty (0-byte) file
        empty_file = "scratch/empty_test_0byte.mp4"
        with open(empty_file, "wb") as f:
            pass
        try:
            with self.assertLogs("triggered_clip_service", level="ERROR") as cm:
                service._upload_clip_worker(empty_file, job_id="empty_job")
                self.assertTrue(any("empty (0 bytes)" in msg for msg in cm.output))
        finally:
            if os.path.exists(empty_file):
                os.remove(empty_file)

        # 3. Unreachable backend (ConnectionError)
        mock_requests_post.side_effect = requests.exceptions.ConnectionError("Failed to establish a new connection")
        with self.assertLogs("triggered_clip_service", level="ERROR") as cm:
            service._upload_clip_worker(self.valid_test_mp4, job_id="conn_err_job")
            self.assertTrue(any("Connection failure to backend" in msg for msg in cm.output))

        # 4. Request Timeout
        mock_requests_post.side_effect = requests.exceptions.Timeout("Read timed out")
        with self.assertLogs("triggered_clip_service", level="ERROR") as cm:
            service._upload_clip_worker(self.valid_test_mp4, job_id="timeout_job")
            self.assertTrue(any("Request timed out" in msg for msg in cm.output))

        # 5. Rejected request (non-200, e.g. 500)
        mock_err_resp = MagicMock()
        mock_err_resp.status_code = 500
        mock_err_resp.text = "Internal Server Error: Pipeline exception"
        mock_requests_post.side_effect = None
        mock_requests_post.return_value = mock_err_resp
        with self.assertLogs("triggered_clip_service", level="ERROR") as cm:
            service._upload_clip_worker(self.valid_test_mp4, job_id="rejected_job")
            self.assertTrue(any("Backend returned non-200 status 500" in msg for msg in cm.output))

    def test_stage_e_simulated_multiple_person_trigger_to_upload(self):
        """Stage E: Simulate multiple persons trigger condition and verify recording to upload path."""
        saved_clips = []
        def capture_saved_clip(path, source="CAMERA"):
            saved_clips.append((path, source))

        recorder = TriggeredClipRecorder(
            fps=15.0,
            width=640,
            height=480,
            pre_trigger_seconds=0.5,   # ~7 frames
            post_trigger_seconds=0.5,  # ~8 frames
            cooldown_seconds=0.0,
            on_clip_saved=capture_saved_clip
        )

        dummy_frame = np.full((480, 640, 3), 120, dtype=np.uint8)

        # Buffer pre-trigger frames
        for _ in range(8):
            recorder.add_frame(dummy_frame)

        # Activate trigger
        recorder.trigger(source="TEST-CAM-01")
        self.assertEqual(recorder._state, "RECORDING")

        # Feed post-trigger frames to finish recording
        for _ in range(8):
            recorder.add_frame(dummy_frame)

        # Allow background writer thread to write and validate MP4
        time.sleep(1.0)

        self.assertGreaterEqual(len(saved_clips), 1, "on_clip_saved must be called with the validated clip")
        recorded_path, source = saved_clips[0]
        self.assertEqual(source, "TEST-CAM-01")
        self.assertTrue(os.path.exists(recorded_path))
        self.assertGreater(os.path.getsize(recorded_path), 0)

        # Clean up recorded test clip
        if os.path.exists(recorded_path):
            try:
                os.remove(recorded_path)
            except Exception:
                pass

    def test_stage_f_threat_decision_and_incident_creation(self):
        """Stage F: Verify normal prediction creates no incident, while violence triggers incident persistence."""
        dispatcher = AlertDispatcher()

        # 1. Normal benign prediction
        normal_result = {
            "status": "No distress detected",
            "model1": {"prediction": "Normal", "confidence": 98.0},
            "model2": {"prediction": "Normal", "confidence": 99.0},
            "persons": []
        }
        inc_normal = dispatcher.maybe_dispatch(normal_result, self.valid_test_mp4)
        self.assertIsNone(inc_normal, "Normal prediction must not create an incident")

        # 2. Controlled violence prediction (mocking external notification channels)
        with patch.object(dispatcher, "_dispatch_job_async") as mock_dispatch:
            violence_result = {
                "status": "Distress Detected",
                "model1": {"prediction": "Violence", "confidence": 92.5},
                "model2": {"prediction": "Punching", "confidence": 89.0},
                "persons": [
                    {
                        "track_id": 1,
                        "gender": "Female",
                        "distress": True,
                        "confidence": 0.85
                    }
                ]
            }
            inc_violence = dispatcher.maybe_dispatch(
                violence_result, 
                "scratch/test_stage_f_violence.mp4",
                location_data={"latitude": 12.9716, "longitude": 77.5946}
            )
            self.assertIsNotNone(inc_violence, "Violence prediction must qualify and generate an Incident ID")
            self.assertTrue(inc_violence.startswith("INC-"))

if __name__ == "__main__":
    unittest.main()

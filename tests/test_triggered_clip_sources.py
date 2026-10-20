import os
import time
import unittest
import numpy as np
import cv2
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app import app
from modules.webcam_stream_processor import WebcamStreamProcessor
from modules.ip_webcam_processor import IPWebcamStreamProcessor
from modules.triggered_clip_recorder import TriggeredClipRecorder
from services.triggered_clip_service import TriggeredClipService, on_triggered_clip_saved

class TestTriggeredClipSources(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        os.makedirs("scratch", exist_ok=True)
        cls.test_clip_path = "scratch/triggered_test_fixture.mp4"
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        out = cv2.VideoWriter(cls.test_clip_path, fourcc, 15.0, (640, 480))
        for i in range(15):
            frame = np.full((480, 640, 3), (i * 15) % 255, dtype=np.uint8)
            out.write(frame)
        out.release()

    @classmethod
    def tearDownClass(cls):
        if os.path.exists(cls.test_clip_path):
            try:
                os.remove(cls.test_clip_path)
            except Exception:
                pass

    @patch("services.triggered_clip_service.requests.post")
    def test_webcam_processor_triggered_clip_callback_to_predict(self, mock_post):
        """
        Verify that WebcamStreamProcessor's TriggeredClipRecorder correctly invokes
        on_triggered_clip_saved, which invokes TriggeredClipService, and dispatches to /predict
        with X-Request-Origin: triggered_clip.
        """
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "status": "Distress Detected",
            "model1": {"prediction": "Violence", "confidence": 91.0},
            "model2": {"prediction": "Punching", "confidence": 84.0},
            "model3": {"people_detected": 2, "frames_processed": 15},
            "incident_id": "INC-WEBCAM-TRIGGER-001"
        }
        mock_post.return_value = mock_resp

        processor = WebcamStreamProcessor(camera_id="WEBCAM-TEST-01")
        # Ensure recorder has zero cooldown for this test
        processor._triggered_clip_recorder.cooldown_seconds = 0.0

        recorded_clips = []
        def test_callback(path, source="CAMERA", correlation_id=None):
            recorded_clips.append((path, source, correlation_id))
            # Trigger real service submission
            on_triggered_clip_saved(path, source=source, correlation_id=correlation_id)

        processor._triggered_clip_recorder.on_clip_saved = test_callback

        dummy_frame = np.full((480, 640, 3), 150, dtype=np.uint8)
        # Buffer pre-trigger frames
        for _ in range(5):
            processor._triggered_clip_recorder.add_frame(dummy_frame)

        # Trigger recording as webcam processor does
        corr_id = "wbcm-test-corr"
        processor._triggered_clip_recorder.trigger(source=processor.camera_id, correlation_id=corr_id)

        # Feed post-trigger frames to complete recording
        for _ in range(processor._triggered_clip_recorder.post_frames):
            processor._triggered_clip_recorder.add_frame(dummy_frame)

        # Allow async writer thread to write, validate, and invoke callback
        time.sleep(1.2)

        self.assertGreaterEqual(len(recorded_clips), 1, "Webcam triggered clip callback was not invoked")
        clip_path, src, cid = recorded_clips[0]
        self.assertEqual(src, "WEBCAM-TEST-01")
        self.assertEqual(cid, corr_id)
        self.assertTrue(os.path.exists(clip_path))

        # Verify requests.post was invoked with the clip and correct headers
        mock_post.assert_called_once()
        call_args, call_kwargs = mock_post.call_args
        self.assertIn("/predict", call_args[0])
        self.assertEqual(call_kwargs["headers"].get("X-Request-Origin"), "triggered_clip")
        self.assertEqual(call_kwargs["headers"].get("X-Correlation-ID"), corr_id)

        # Clean up
        if os.path.exists(clip_path):
            try:
                os.remove(clip_path)
            except Exception:
                pass

    @patch("services.triggered_clip_service.requests.post")
    def test_ip_webcam_processor_triggered_clip_callback_to_predict(self, mock_post):
        """
        Verify that IPWebcamStreamProcessor's TriggeredClipRecorder correctly invokes
        on_triggered_clip_saved, which invokes TriggeredClipService, and dispatches to /predict
        with X-Request-Origin: triggered_clip.
        """
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "status": "Distress Detected",
            "model1": {"prediction": "Violence", "confidence": 88.0},
            "model2": {"prediction": "Fall", "confidence": 80.0},
            "model3": {"people_detected": 2, "frames_processed": 15},
            "incident_id": "INC-IPCAM-TRIGGER-002"
        }
        mock_post.return_value = mock_resp

        processor = IPWebcamStreamProcessor(
            stream_url="http://192.168.1.50:8080/video",
            camera_id="IP-WEBCAM-TEST-02"
        )
        processor._triggered_clip_recorder.cooldown_seconds = 0.0

        recorded_clips = []
        def test_callback(path, source="CAMERA", correlation_id=None):
            recorded_clips.append((path, source, correlation_id))
            on_triggered_clip_saved(path, source=source, correlation_id=correlation_id)

        processor._triggered_clip_recorder.on_clip_saved = test_callback

        dummy_frame = np.full((480, 640, 3), 90, dtype=np.uint8)
        for _ in range(5):
            processor._triggered_clip_recorder.add_frame(dummy_frame)

        corr_id = "ipcam-test-corr"
        processor._triggered_clip_recorder.trigger(source=processor.camera_id, correlation_id=corr_id)

        for _ in range(processor._triggered_clip_recorder.post_frames):
            processor._triggered_clip_recorder.add_frame(dummy_frame)

        time.sleep(1.2)

        self.assertGreaterEqual(len(recorded_clips), 1, "IP Webcam triggered clip callback was not invoked")
        clip_path, src, cid = recorded_clips[0]
        self.assertEqual(src, "IP-WEBCAM-TEST-02")
        self.assertEqual(cid, corr_id)
        self.assertTrue(os.path.exists(clip_path))

        mock_post.assert_called_once()
        call_args, call_kwargs = mock_post.call_args
        self.assertIn("/predict", call_args[0])
        self.assertEqual(call_kwargs["headers"].get("X-Request-Origin"), "triggered_clip")
        self.assertEqual(call_kwargs["headers"].get("X-Correlation-ID"), corr_id)

        if os.path.exists(clip_path):
            try:
                os.remove(clip_path)
            except Exception:
                pass

    @patch("routes.predict.pipeline.process")
    @patch("routes.predict.alert_dispatcher.maybe_dispatch")
    def test_predict_endpoint_handles_triggered_clip_correctly(self, mock_dispatch, mock_process):
        """
        Verify that /predict accepts a triggered clip upload with headers, runs inference,
        and returns the prediction result.
        """
        mock_process.return_value = {
            "status": "Distress Detected",
            "model1": {"prediction": "Violence", "confidence": 89.0},
            "model2": {"prediction": "Punching", "confidence": 82.0},
            "model3": {"people_detected": 2, "frames_processed": 15},
            "persons": [{"gender": "Female", "distress": True}]
        }
        mock_dispatch.return_value = "INC-TRIGGER-PREDICT-999"

        client = TestClient(app)
        with open(self.test_clip_path, "rb") as f:
            resp = client.post(
                "/predict",
                files={"file": ("triggered_1792393227_test.mp4", f, "video/mp4")},
                headers={
                    "X-Request-Origin": "triggered_clip",
                    "X-Correlation-ID": "trig-job-1234"
                }
            )

        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "Distress Detected")
        self.assertEqual(data["incident_id"], "INC-TRIGGER-PREDICT-999")
        mock_process.assert_called_once()
        mock_dispatch.assert_called_once()

if __name__ == "__main__":
    unittest.main()

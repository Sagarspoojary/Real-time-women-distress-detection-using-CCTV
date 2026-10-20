import os
import io
import time
import unittest
import concurrent.futures
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app import app

class TestDuplicateInferenceProtection(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    @patch("routes.predict.pipeline.process")
    @patch("routes.predict.alert_dispatcher.maybe_dispatch")
    def test_in_flight_concurrent_requests_share_inference(self, mock_dispatch, mock_process):
        def slow_process(path):
            time.sleep(0.3)
            return {
                "model1": {"prediction": "Violence", "confidence": 92.0},
                "model2": {"prediction": "Punching", "confidence": 88.0},
                "model3": {"people_detected": 2, "frames_processed": 50},
                "persons": [],
                "status": "Distress Detected"
            }
        mock_process.side_effect = slow_process
        mock_dispatch.return_value = "INC-TEST-12345"

        file_content = b"IDENTICAL_IN_FLIGHT_VIDEO_PAYLOAD_V11"

        def send_req(req_id):
            client = TestClient(app)
            return client.post(
                "/predict",
                files={"file": ("test_dup_v11.mp4", io.BytesIO(file_content), "video/mp4")},
                headers={"X-Request-Origin": "manual_upload", "X-Correlation-ID": req_id}
            )

        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            f1 = executor.submit(send_req, "concurrent-1")
            f2 = executor.submit(send_req, "concurrent-2")
            r1 = f1.result()
            r2 = f2.result()

        self.assertEqual(r1.status_code, 200)
        self.assertEqual(r2.status_code, 200)
        self.assertEqual(r1.json()["status"], "Distress Detected")
        self.assertEqual(r2.json()["status"], "Distress Detected")
        # Exactly ONE heavy inference pass executed despite two simultaneous HTTP requests!
        self.assertEqual(mock_process.call_count, 1)

    @patch("routes.predict.pipeline.process")
    @patch("routes.predict.alert_dispatcher.maybe_dispatch")
    def test_sequential_duplicate_upload_is_not_discarded(self, mock_dispatch, mock_process):
        mock_process.return_value = {
            "model1": {"prediction": "Violence", "confidence": 92.0},
            "model2": {"prediction": "Punching", "confidence": 88.0},
            "model3": {"people_detected": 2, "frames_processed": 50},
            "persons": [],
            "status": "Distress Detected"
        }
        mock_dispatch.return_value = "INC-TEST-12345"

        file_content = b"FAKE_VIDEO_PAYLOAD_FOR_DEDUPLICATION_TEST"
        
        # Test sequential duplicate upload (should both succeed, second upload is NOT discarded)
        resp1 = self.client.post(
            "/predict",
            files={"file": ("test_dup_v11.mp4", io.BytesIO(file_content), "video/mp4")},
            headers={"X-Request-Origin": "manual_upload", "X-Correlation-ID": "test-req-1"}
        )
        self.assertEqual(resp1.status_code, 200)
        self.assertEqual(resp1.json()["status"], "Distress Detected")

        resp2 = self.client.post(
            "/predict",
            files={"file": ("test_dup_v11.mp4", io.BytesIO(file_content), "video/mp4")},
            headers={"X-Request-Origin": "manual_upload", "X-Correlation-ID": "test-req-2"}
        )
        self.assertEqual(resp2.status_code, 200)
        # Sequential repeated upload is legitimate and allowed to run
        self.assertEqual(mock_process.call_count, 2)

    @patch("routes.predict.pipeline.process")
    @patch("routes.predict.alert_dispatcher.maybe_dispatch")
    def test_different_clips_not_deduplicated(self, mock_dispatch, mock_process):
        mock_process.return_value = {"status": "Normal", "model1": {}, "model2": {}, "model3": {}, "persons": []}
        mock_dispatch.return_value = None

        file_content_1 = b"CLIP_ONE_BYTES"
        file_content_2 = b"CLIP_TWO_BYTES"

        resp1 = self.client.post(
            "/predict",
            files={"file": ("clip1.mp4", io.BytesIO(file_content_1), "video/mp4")},
            headers={"X-Request-Origin": "manual_upload"}
        )
        resp2 = self.client.post(
            "/predict",
            files={"file": ("clip2.mp4", io.BytesIO(file_content_2), "video/mp4")},
            headers={"X-Request-Origin": "manual_upload"}
        )

        self.assertEqual(resp1.status_code, 200)
        self.assertEqual(resp2.status_code, 200)
        self.assertEqual(mock_process.call_count, 2)

if __name__ == "__main__":
    unittest.main()

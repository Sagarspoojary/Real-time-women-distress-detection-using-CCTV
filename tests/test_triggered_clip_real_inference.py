import os
import time
import socket
import threading
import unittest
import numpy as np
import cv2
from unittest.mock import patch

import uvicorn
from app import app
from modules.webcam_stream_processor import WebcamStreamProcessor
from modules.ip_webcam_processor import IPWebcamStreamProcessor
from services.triggered_clip_service import clip_service, on_triggered_clip_saved
from services.alert_dispatcher import AlertDispatcher

def find_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('', 0))
        return s.getsockname()[1]

class TestTriggeredClipRealInference(unittest.TestCase):
    """
    Integration test verifying that TriggeredClipRecorder captures the intended 10-second clip
    (150 frames at 15 FPS), executes the callback to TriggeredClipService, and transmits
    the clip to a real local FastAPI /predict endpoint executing UNMOCKED inference pipeline.
    """
    server = None
    server_thread = None
    server_port = None

    @classmethod
    def setUpClass(cls):
        cls.server_port = find_free_port()
        config = uvicorn.Config(
            app=app,
            host="127.0.0.1",
            port=cls.server_port,
            log_level="warning"
        )
        cls.server = uvicorn.Server(config=config)
        cls.server_thread = threading.Thread(target=cls.server.run, daemon=True)
        cls.server_thread.start()

        # Wait for ephemeral server to be responsive
        import requests
        retries = 30
        while retries > 0:
            try:
                r = requests.get(f"http://127.0.0.1:{cls.server_port}/")
                if r.status_code == 200:
                    break
            except Exception:
                pass
            time.sleep(0.2)
            retries -= 1

        # Point triggered clip service to the ephemeral server
        cls._orig_api_url = clip_service.api_url
        clip_service.api_url = f"http://127.0.0.1:{cls.server_port}/predict"

    @classmethod
    def tearDownClass(cls):
        clip_service.api_url = cls._orig_api_url
        if cls.server:
            cls.server.should_exit = True
            cls.server_thread.join(timeout=3)

    def test_webcam_processor_10s_clip_real_predict_inference(self):
        """
        Verify webcam software path:
        - 75 pre-trigger + 75 post-trigger frames = 150 frames (10.0s at 15 FPS)
        - Callback triggers TriggeredClipService
        - Real /predict executes real WomenDistressPipeline (unmocked)
        - Notifications mocked to prevent real email/SMS dispatch
        """
        saved_clips = []
        def intercept_callback(path, source="CAMERA", correlation_id=None):
            saved_clips.append((path, source, correlation_id))
            on_triggered_clip_saved(path, source=source, correlation_id=correlation_id)

        processor = WebcamStreamProcessor(camera_id="WEBCAM-REAL-01")
        processor._triggered_clip_recorder.cooldown_seconds = 0.0
        processor._triggered_clip_recorder.on_clip_saved = intercept_callback

        dummy_frame = np.full((480, 640, 3), 120, dtype=np.uint8)

        # 1. Fill pre-trigger buffer with exactly 75 frames (5.0s at 15 FPS)
        for _ in range(75):
            processor._triggered_clip_recorder.add_frame(dummy_frame)

        # 2. Trigger the recorder
        corr_id = "real-webcam-10s"
        processor._triggered_clip_recorder.trigger(source=processor.camera_id, correlation_id=corr_id)

        # 3. Feed 75 post-trigger frames (5.0s at 15 FPS)
        for _ in range(75):
            processor._triggered_clip_recorder.add_frame(dummy_frame)

        # 4. Wait for async MP4 finalization and upload worker completion
        with patch.object(AlertDispatcher, "_dispatch_job_async", return_value=None):
            time.sleep(6.0)

        self.assertGreaterEqual(len(saved_clips), 1, "Recorder callback was not invoked")
        clip_path, src, cid = saved_clips[0]
        self.assertEqual(src, "WEBCAM-REAL-01")
        self.assertEqual(cid, corr_id)
        self.assertTrue(os.path.exists(clip_path), f"Clip not found: {clip_path}")

        # Verify 10-second duration: 150 frames @ 15 FPS
        cap = cv2.VideoCapture(clip_path)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        cap.release()

        self.assertEqual(frame_count, 150, f"Expected 150 frames (10s @ 15fps), got {frame_count}")
        self.assertAlmostEqual(fps, 15.0, places=1)
        duration_sec = frame_count / fps
        self.assertAlmostEqual(duration_sec, 10.0, places=1, msg="Clip duration should be ~10.0s")

        # Cleanup test clip
        if os.path.exists(clip_path):
            try:
                os.remove(clip_path)
            except Exception:
                pass

    def test_ip_webcam_processor_10s_clip_real_predict_inference(self):
        """
        Verify IP webcam software path:
        - 75 pre-trigger + 75 post-trigger frames = 150 frames (10.0s at 15 FPS)
        - Callback triggers TriggeredClipService
        - Real /predict executes real WomenDistressPipeline (unmocked)
        - Notifications mocked to prevent real email/SMS dispatch
        """
        saved_clips = []
        def intercept_callback(path, source="CAMERA", correlation_id=None):
            saved_clips.append((path, source, correlation_id))
            on_triggered_clip_saved(path, source=source, correlation_id=correlation_id)

        processor = IPWebcamStreamProcessor(
            stream_url="http://192.168.1.88:8080/video",
            camera_id="IPCAM-REAL-02"
        )
        processor._triggered_clip_recorder.cooldown_seconds = 0.0
        processor._triggered_clip_recorder.on_clip_saved = intercept_callback

        dummy_frame = np.full((480, 640, 3), 85, dtype=np.uint8)

        # 1. Fill pre-trigger buffer with exactly 75 frames (5.0s at 15 FPS)
        for _ in range(75):
            processor._triggered_clip_recorder.add_frame(dummy_frame)

        # 2. Trigger the recorder
        corr_id = "real-ipcam-10s"
        processor._triggered_clip_recorder.trigger(source=processor.camera_id, correlation_id=corr_id)

        # 3. Feed 75 post-trigger frames (5.0s at 15 FPS)
        for _ in range(75):
            processor._triggered_clip_recorder.add_frame(dummy_frame)

        # 4. Wait for async MP4 finalization and upload worker completion
        with patch.object(AlertDispatcher, "_dispatch_job_async", return_value=None):
            time.sleep(6.0)

        self.assertGreaterEqual(len(saved_clips), 1, "Recorder callback was not invoked")
        clip_path, src, cid = saved_clips[0]
        self.assertEqual(src, "IPCAM-REAL-02")
        self.assertEqual(cid, corr_id)
        self.assertTrue(os.path.exists(clip_path), f"Clip not found: {clip_path}")

        # Verify 10-second duration: 150 frames @ 15 FPS
        cap = cv2.VideoCapture(clip_path)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        cap.release()

        self.assertEqual(frame_count, 150, f"Expected 150 frames (10s @ 15fps), got {frame_count}")
        self.assertAlmostEqual(fps, 15.0, places=1)
        duration_sec = frame_count / fps
        self.assertAlmostEqual(duration_sec, 10.0, places=1, msg="Clip duration should be ~10.0s")

        # Cleanup test clip
        if os.path.exists(clip_path):
            try:
                os.remove(clip_path)
            except Exception:
                pass

if __name__ == "__main__":
    unittest.main()

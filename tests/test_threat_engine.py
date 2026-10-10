import unittest
from unittest.mock import patch, MagicMock
import os
import time

from modules.webcam_stream_processor import WebcamStreamProcessor
from modules.ip_webcam_processor import IPWebcamStreamProcessor

class TestThreatEngine(unittest.TestCase):
    def setUp(self):
        # Prevent actual alert dispatches and evidence recording during test
        self.patcher_dispatch = patch('services.alert_dispatcher.AlertDispatcher.maybe_dispatch')
        self.mock_dispatch = self.patcher_dispatch.start()
        
        self.patcher_evidence = patch('modules.evidence_recorder.EvidenceRecorder.save_evidence')
        self.mock_evidence = self.patcher_evidence.start()
        self.mock_evidence.return_value = ("/mock/video.mp4", "/mock/snapshot.jpg")

    def tearDown(self):
        self.patcher_dispatch.stop()
        self.patcher_evidence.stop()

    @patch('modules.webcam_stream_processor.WomenDistressPipeline')
    def test_sos_reaches_threat_handling_path_laptop(self, mock_pipeline_class):
        """SOS prediction above threshold triggers threat evaluation on laptop processor."""
        mock_pipeline = mock_pipeline_class.return_value
        
        processor = WebcamStreamProcessor(camera_id="TEST-LAPTOP")
        
        # Test 1: SOS below threshold -> NORMAL
        mock_pipeline.process_videomae.return_value = {
            "model1": {"prediction": "Normal", "confidence": 90.0},
            "model2": {"prediction": "SOS", "confidence": 70.0}  # Below 75%
        }
        processor._run_inference_async([])
        self.assertEqual(processor._threat_state, "NORMAL")
        self.assertEqual(processor._consecutive_threats, 0)
        
        # Test 2: SOS above threshold -> VIOLENCE SUSPECTED (1st hit)
        mock_pipeline.process_videomae.return_value = {
            "model1": {"prediction": "Normal", "confidence": 90.0},
            "model2": {"prediction": "SOS", "confidence": 99.0}  # Above 75%
        }
        processor._run_inference_async([])
        self.assertEqual(processor._consecutive_threats, 1)
        self.assertEqual(processor._threat_state, "VIOLENCE SUSPECTED")  # Wait for confirmation
        self.assertFalse(processor._threat_active)
        
        # Test 3: Repeated SOS above threshold -> THREAT ACTIVE
        processor._run_inference_async([])
        self.assertEqual(processor._consecutive_threats, 2)
        self.assertEqual(processor._threat_state, "THREAT ACTIVE")
        self.assertTrue(processor._threat_active)
        self.assertTrue(self.mock_evidence.called)
        self.assertTrue(self.mock_dispatch.called)
        
        # Test 4: Repeated SOS respects deduplication (does not dispatch twice)
        self.mock_dispatch.reset_mock()
        self.mock_evidence.reset_mock()
        processor._run_inference_async([])
        self.assertEqual(processor._consecutive_threats, 3)
        self.assertEqual(processor._threat_state, "THREAT ACTIVE")
        self.assertFalse(self.mock_evidence.called)
        self.assertFalse(self.mock_dispatch.called)

    @patch('modules.ip_webcam_processor.WomenDistressPipeline')
    def test_fall_reaches_threat_handling_path_ip(self, mock_pipeline_class):
        """Fall prediction above threshold triggers threat evaluation on IP processor."""
        mock_pipeline = mock_pipeline_class.return_value
        
        with patch('modules.ip_webcam_processor.IPWebcamStreamProcessor._validate_url'):
            processor = IPWebcamStreamProcessor(stream_url="http://mock")
        
        # Test 1: Fall below threshold -> NORMAL
        mock_pipeline.process_videomae.return_value = {
            "model1": {"prediction": "Normal", "confidence": 90.0},
            "model2": {"prediction": "Fall", "confidence": 60.0}  # Below 75%
        }
        processor._run_inference_async([])
        self.assertEqual(processor._threat_state, "NORMAL")
        self.assertEqual(processor._consecutive_threats, 0)
        
        # Test 2: Fall above threshold -> triggers count
        mock_pipeline.process_videomae.return_value = {
            "model1": {"prediction": "Normal", "confidence": 90.0},
            "model2": {"prediction": "Fall", "confidence": 85.0}  # Above 75%
        }
        processor._run_inference_async([])
        processor._run_inference_async([])
        self.assertEqual(processor._consecutive_threats, 2)
        self.assertEqual(processor._threat_state, "THREAT ACTIVE")
        self.assertTrue(processor._threat_active)

    @patch('modules.webcam_stream_processor.WomenDistressPipeline')
    def test_existing_threats_unchanged(self, mock_pipeline_class):
        """Violence, Assault, and Punching continue to work correctly."""
        mock_pipeline = mock_pipeline_class.return_value
        processor = WebcamStreamProcessor(camera_id="TEST-LAPTOP")
        
        # Assault from Model 1
        mock_pipeline.process_videomae.return_value = {
            "model1": {"prediction": "Assault", "confidence": 95.0},
            "model2": {"prediction": "Normal", "confidence": 90.0}
        }
        processor._run_inference_async([])
        processor._run_inference_async([])
        self.assertEqual(processor._threat_state, "THREAT ACTIVE")
        
        processor = WebcamStreamProcessor(camera_id="TEST-LAPTOP2")
        # Punching from Model 2
        mock_pipeline.process_videomae.return_value = {
            "model1": {"prediction": "Normal", "confidence": 90.0},
            "model2": {"prediction": "Punching", "confidence": 95.0}
        }
        processor._run_inference_async([])
        processor._run_inference_async([])
        self.assertEqual(processor._threat_state, "THREAT ACTIVE")

if __name__ == '__main__':
    unittest.main()

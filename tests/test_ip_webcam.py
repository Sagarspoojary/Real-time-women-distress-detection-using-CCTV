import unittest
from unittest.mock import patch, MagicMock
from modules.ip_webcam_processor import IPWebcamStreamProcessor

class TestIPWebcamProcessor(unittest.TestCase):

    @patch("modules.ip_webcam_processor.WomenDistressPipeline")
    def test_ssrf_protection_invalid_scheme(self, mock_pipeline):
        """Test that non-HTTP/RTSP URLs are rejected."""
        with self.assertRaises(ValueError) as ctx:
            IPWebcamStreamProcessor(stream_url="file:///etc/passwd")
        self.assertIn("Invalid URL scheme", str(ctx.exception))

        with self.assertRaises(ValueError):
            IPWebcamStreamProcessor(stream_url="ftp://192.168.1.1/video")

    @patch("modules.ip_webcam_processor.WomenDistressPipeline")
    def test_ssrf_protection_cloud_metadata(self, mock_pipeline):
        """Test that cloud metadata IP is rejected."""
        with self.assertRaises(ValueError) as ctx:
            IPWebcamStreamProcessor(stream_url="http://169.254.169.254/latest/meta-data")
        self.assertIn("Access to cloud metadata endpoints is forbidden", str(ctx.exception))

    @patch("modules.ip_webcam_processor.WomenDistressPipeline")
    def test_valid_url_accepted(self, mock_pipeline):
        """Test that a standard local IP webcam URL is accepted."""
        processor = IPWebcamStreamProcessor(stream_url="http://192.168.1.100:8080/video")
        self.assertEqual(processor.stream_url, "http://192.168.1.100:8080/video")

    @patch("modules.ip_webcam_processor.WomenDistressPipeline")
    @patch("modules.ip_webcam_processor.cv2.VideoCapture")
    def test_mock_stream_reception(self, mock_cv2_capture, mock_pipeline):
        """Test the mocked frame reading logic doesn't crash on empty frames."""
        mock_cap = MagicMock()
        mock_cap.isOpened.return_value = True
        mock_cap.read.return_value = (False, None) # Stream ended or failed
        mock_cap.get.return_value = 30.0
        mock_cv2_capture.return_value = mock_cap
        
        processor = IPWebcamStreamProcessor(stream_url="http://mock-cam/video")
        processor._running = True
        
        def break_loop(*args):
            processor._running = False

        with patch("modules.ip_webcam_processor.time.sleep", side_effect=break_loop):
            processor._worker_loop()
            
        self.assertEqual(processor._frames_processed, 0)
        self.assertTrue(mock_cap.release.called)

if __name__ == "__main__":
    unittest.main()

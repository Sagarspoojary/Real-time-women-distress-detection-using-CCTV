import os
import time
import unittest
from unittest.mock import patch, MagicMock

from services.alert_dispatcher import AlertDispatcher
from services.sms_service import SMSService
from services.email_service import EmailService

class TestParallelNotifications(unittest.TestCase):
    def setUp(self):
        # Clear cooldown between tests
        self.dispatcher = AlertDispatcher()
        self.dispatcher._cooldown_registry.clear()

    @patch("services.alert_dispatcher.EmailService.send_alert_email")
    @patch("services.alert_dispatcher.SMSService.send_sms")
    def test_email_and_sms_start_concurrently(self, mock_send_sms, mock_send_email):
        """
        Prove that SMS does not wait for a slow SMTP connection.
        If SMTP takes 1 second, SMS should start and complete immediately in parallel.
        """
        sms_started_time = []
        email_started_time = []

        def slow_email(*args, **kwargs):
            email_started_time.append(time.time())
            time.sleep(0.5)
            return 2

        def fast_sms(*args, **kwargs):
            sms_started_time.append(time.time())
            return True

        mock_send_email.side_effect = slow_email
        mock_send_sms.side_effect = fast_sms

        with patch.dict(os.environ, {
            "ENABLE_EMAIL_ALERTS": "true",
            "SMS_ENABLED": "true",
            "ALERT_EMAIL_1": "test@example.com",
            "SMS_ALERT_THRESHOLD": "50.0"
        }):
            self.dispatcher._sms_service.enabled = True

            job = {
                "incident_id": "INC-TEST-PARALLEL-01",
                "source_key": "CAM_PARALLEL",
                "threat_type": "Violence",
                "confidence": 95.0,
                "risk_level": "CRITICAL",
                "model1_pred": "Violence",
                "model1_conf": 95.0,
                "model2_pred": "Normal",
                "model2_conf": 0.0,
                "persons": [{"gender": "Female"}],
                "video_path": "outputs/test_clip.mp4",
                "snapshot_path": None,
                "location_data": {"latitude": 12.9716, "longitude": 77.5946}
            }

            t0 = time.time()
            self.dispatcher._dispatch_job_async(job)
            t_total = time.time() - t0

            # Both services must have been called
            self.assertEqual(len(email_started_time), 1)
            self.assertEqual(len(sms_started_time), 1)

            # Both must have started within 50ms of each other (concurrent launch)
            time_diff = abs(email_started_time[0] - sms_started_time[0])
            self.assertLess(time_diff, 0.1, f"Channels did not start concurrently; delta={time_diff*1000:.1f}ms")

    @patch("services.alert_dispatcher.EmailService.send_alert_email")
    @patch("services.alert_dispatcher.SMSService.send_sms")
    def test_email_failure_does_not_block_sms(self, mock_send_sms, mock_send_email):
        """SMTP error (e.g. connection closed) must NOT prevent SMS dispatch."""
        mock_send_email.side_effect = RuntimeError("Connection unexpectedly closed")
        mock_send_sms.return_value = True

        with patch.dict(os.environ, {
            "ENABLE_EMAIL_ALERTS": "true",
            "SMS_ENABLED": "true",
            "ALERT_EMAIL_1": "test@example.com",
            "SMS_ALERT_THRESHOLD": "50.0"
        }):
            self.dispatcher._sms_service.enabled = True

            job = {
                "incident_id": "INC-TEST-ERR-01",
                "source_key": "CAM_ERR",
                "threat_type": "Assault",
                "confidence": 98.0,
                "risk_level": "CRITICAL",
                "model1_pred": "Assault",
                "model1_conf": 98.0,
                "model2_pred": "Normal",
                "model2_conf": 0.0,
                "persons": [],
                "video_path": "outputs/test.mp4",
                "snapshot_path": None,
                "location_data": {}
            }

            self.dispatcher._dispatch_job_async(job)
            mock_send_sms.assert_called_once()

    @patch("services.alert_dispatcher.EmailService.send_alert_email")
    @patch("services.alert_dispatcher.SMSService.send_sms")
    def test_sms_failure_does_not_block_email(self, mock_send_sms, mock_send_email):
        """SMS failure must NOT prevent Email dispatch."""
        mock_send_email.return_value = 1
        mock_send_sms.side_effect = Exception("TextBee connection timed out")

        with patch.dict(os.environ, {
            "ENABLE_EMAIL_ALERTS": "true",
            "SMS_ENABLED": "true",
            "ALERT_EMAIL_1": "test@example.com",
            "SMS_ALERT_THRESHOLD": "50.0"
        }):
            self.dispatcher._sms_service.enabled = True

            job = {
                "incident_id": "INC-TEST-ERR-02",
                "source_key": "CAM_ERR2",
                "threat_type": "Violence",
                "confidence": 85.0,
                "risk_level": "HIGH",
                "model1_pred": "Violence",
                "model1_conf": 85.0,
                "model2_pred": "Normal",
                "model2_conf": 0.0,
                "persons": [],
                "video_path": "outputs/test.mp4",
                "snapshot_path": None,
                "location_data": {}
            }

            self.dispatcher._dispatch_job_async(job)
            self.assertTrue(mock_send_email.called)

    @patch("database.crud.create_incident")
    def test_reprocessing_same_source_cooldown_suppresses_duplicate(self, mock_crud):
        """Reprocessing the same video source within cooldown does not generate duplicate alert jobs."""
        pipeline_result = {
            "model1": {"prediction": "Violence", "confidence": 90.0},
            "model2": {"prediction": "Normal", "confidence": 0.0},
            "persons": []
        }

        with patch.object(self.dispatcher, "_dispatch_job_async", return_value=None):
            # First dispatch qualifies
            inc1 = self.dispatcher.maybe_dispatch(pipeline_result, "uploads/test_cooldown.mp4")
            self.assertIsNotNone(inc1)

            # Immediate second dispatch for same video is suppressed by cooldown
            inc2 = self.dispatcher.maybe_dispatch(pipeline_result, "uploads/test_cooldown.mp4")
            self.assertIsNone(inc2)

if __name__ == "__main__":
    unittest.main()

"""
Unit & Integration Tests for Phone Notifications (Fast2SMS), Emergency Contacts, Cooldown, and RTSP Workers
"""
import unittest
from unittest.mock import MagicMock, patch
import os
import json

from services.phone_notification_service import PhoneNotificationService, is_valid_e164, mask_phone_number
from services.emergency_contact_service import EmergencyContactService
from services.alert_dispatcher import AlertDispatcher, _compute_risk_level
from modules.rtsp_stream_processor import RTSPStreamProcessor


class TestPhoneValidationAndNormalization(unittest.TestCase):
    def setUp(self):
        self.service = PhoneNotificationService()

    def test_e164_validation(self):
        self.assertTrue(is_valid_e164("+919876543210"))
        self.assertTrue(is_valid_e164("+14155552671"))
        self.assertFalse(is_valid_e164("9876543210"))
        self.assertFalse(is_valid_e164("+91 98765 43210"))
        self.assertFalse(is_valid_e164("invalid"))
        self.assertFalse(is_valid_e164(""))

    def test_fast2sms_phone_normalization(self):
        valid, digits = self.service.normalize_for_fast2sms("+918971175397")
        self.assertTrue(valid)
        self.assertEqual(digits, "8971175397")

        valid, digits = self.service.normalize_for_fast2sms("8971175397")
        self.assertTrue(valid)
        self.assertEqual(digits, "8971175397")

        valid, digits = self.service.normalize_for_fast2sms("+91 89711 75397")
        self.assertTrue(valid)
        self.assertEqual(digits, "8971175397")

        valid, digits = self.service.normalize_for_fast2sms("+14155552671")  # Non-Indian 10 digit number
        self.assertFalse(valid)

    def test_phone_masking(self):
        self.assertEqual(mask_phone_number("+919876543210"), "+9198****3210")
        self.assertEqual(mask_phone_number("+14155552671"), "+1415***2671")
        self.assertEqual(mask_phone_number("1234"), "****")


class TestEmergencyContactService(unittest.TestCase):
    def setUp(self):
        self.service = EmergencyContactService()
        self.test_contacts_file = os.path.join("data", "emergency_contacts.json")

    def test_legacy_contacts_migration(self):
        legacy_data = {"contacts": ["user1@test.com", "user2@test.com", "", ""]}
        with open(self.test_contacts_file, "w") as f:
            json.dump(legacy_data, f)

        loaded = self.service.load_contacts()
        self.assertEqual(len(loaded), 4)
        self.assertEqual(loaded[0]["email"], "user1@test.com")
        self.assertTrue(loaded[0]["enabled"])

    def test_update_contact_with_e164_phone(self):
        updated = self.service.update_contact(0, {
            "name": "Security Manager",
            "email": "manager@security.com",
            "phone": "+919876543210",
            "enabled": True
        })
        self.assertEqual(updated[0]["email"], "manager@security.com")
        self.assertEqual(updated[0]["phone"], "+919876543210")

        phones = self.service.get_enabled_phone_numbers()
        self.assertIn("+919876543210", phones)

    def test_invalid_phone_raises_error(self):
        with self.assertRaises(ValueError):
            self.service.update_contact(0, {
                "name": "Invalid Contact",
                "email": "test@test.com",
                "phone": "9876543210",
                "enabled": True
            })


class TestFast2SMSNotificationService(unittest.TestCase):
    def test_mock_sms_dispatch(self):
        service = PhoneNotificationService()
        service.fast2sms_api_key = ""  # Unset triggers mock mode
        service.enable_sms = True

        res = service.send_sms_alert(["+919876543210"], "Test Fast2SMS alert message")
        self.assertTrue(res["success"])
        self.assertEqual(res["provider"], "fast2sms_mock")
        self.assertEqual(res["results"][0]["normalized"], "9876543210")
        self.assertEqual(res["results"][0]["message_id"], "MOCK_FAST2SMS_123456")

    @patch("requests.post")
    def test_live_fast2sms_dispatch_mocked_http_success(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"return": True, "request_id": "F2S_REQ_998877", "message": ["SMS sent"]}
        mock_post.return_value = mock_resp

        service = PhoneNotificationService()
        service.fast2sms_api_key = "FAKE_FAST2SMS_KEY"
        service.enable_sms = True

        res = service.send_sms_alert(["+918971175397"], "Live test message")
        self.assertTrue(res["success"])
        self.assertEqual(res["provider"], "fast2sms")
        self.assertEqual(res["results"][0]["normalized"], "8971175397")
        self.assertEqual(res["results"][0]["request_id"], "F2S_REQ_998877")

    @patch("requests.post")
    def test_fast2sms_error_416_parsing(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 400
        mock_resp.json.return_value = {"return": False, "code": 416, "message": ["You don't have sufficient wallet balance"]}
        mock_post.return_value = mock_resp

        service = PhoneNotificationService()
        service.fast2sms_api_key = "FAKE_FAST2SMS_KEY"
        service.enable_sms = True

        res = service.send_sms_alert(["+918971175397"], "Live test message")
        self.assertFalse(res["success"])
        result_item = res["results"][0]
        self.assertEqual(result_item["status_code"], 400)
        self.assertEqual(result_item["error_code"], 416)
        self.assertIn("wallet balance", result_item["provider_message"].lower())

    def test_voice_call_disabled_gracefully(self):
        service = PhoneNotificationService()
        res = service.trigger_emergency_call(["+919876543210"], "Test voice message")
        self.assertFalse(res["success"])
        self.assertEqual(res["error"], "VOICE_PROVIDER_DISABLED")


class TestAlertDispatcherLogic(unittest.TestCase):
    def test_risk_level_computation(self):
        self.assertEqual(_compute_risk_level(95.0, "Violence"), "CRITICAL")
        self.assertEqual(_compute_risk_level(70.0, "Assault"), "CRITICAL")
        self.assertEqual(_compute_risk_level(80.0, "Violence"), "HIGH")
        self.assertEqual(_compute_risk_level(65.0, "Walking"), "MEDIUM")

    def test_cooldown_suppression(self):
        dispatcher = AlertDispatcher()
        pipeline_res = {
            "model1": {"prediction": "Violence", "confidence": 92.0},
            "model2": {"prediction": "Normal", "confidence": 10.0},
            "persons": []
        }

        with patch.object(dispatcher._job_queue, "put") as mock_put:
            dispatcher.maybe_dispatch(pipeline_res, "test_feed.mp4")
            self.assertEqual(mock_put.call_count, 1)

            # Second call immediately should be suppressed by cooldown
            dispatcher.maybe_dispatch(pipeline_res, "test_feed.mp4")
            self.assertEqual(mock_put.call_count, 1)


class TestRTSPStreamProcessor(unittest.TestCase):
    @patch("cv2.VideoCapture")
    def test_rtsp_connect_and_frame_buffer(self, mock_videocapture):
        mock_cap = MagicMock()
        mock_cap.isOpened.return_value = True
        dummy_frame = (224, 224, 3)
        mock_cap.read.return_value = (True, MagicMock(shape=dummy_frame))
        mock_videocapture.return_value = mock_cap

        processor = RTSPStreamProcessor("CAM-TEST", "Test Cam", "rtsp://test:test@127.0.0.1:554/stream")
        self.assertEqual(processor.frame_buffer.maxlen, 16)
        self.assertEqual(processor.mask_rtsp_url(processor.rtsp_url), "rtsp://****:****@127.0.0.1:554/stream")


if __name__ == "__main__":
    unittest.main()

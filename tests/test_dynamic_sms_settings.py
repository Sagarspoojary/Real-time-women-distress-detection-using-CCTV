import os
import json
import unittest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app import app
from database.database import SessionLocal, Base, engine
from database.models import NotificationSetting
from services.notification_settings_service import (
    NotificationSettingsService,
    normalize_phone_number,
    SETTINGS_FILE,
    SMS_RECIPIENT_KEY
)
from services.sms_service import SMSService
from services.alert_dispatcher import AlertDispatcher

class TestDynamicSMSSettings(unittest.TestCase):

    def setUp(self):
        self.client = TestClient(app)
        Base.metadata.create_all(bind=engine)
        # Clear setting in DB and JSON file
        db = SessionLocal()
        try:
            db.query(NotificationSetting).filter(NotificationSetting.key == SMS_RECIPIENT_KEY).delete()
            db.commit()
        finally:
            db.close()

        if os.path.exists(SETTINGS_FILE):
            try:
                os.remove(SETTINGS_FILE)
            except Exception:
                pass

    def tearDown(self):
        # Cleanup
        db = SessionLocal()
        try:
            db.query(NotificationSetting).filter(NotificationSetting.key == SMS_RECIPIENT_KEY).delete()
            db.commit()
        finally:
            db.close()

        if os.path.exists(SETTINGS_FILE):
            try:
                os.remove(SETTINGS_FILE)
            except Exception:
                pass

    def test_normalization_rules(self):
        # 10-digit Indian mobile
        self.assertEqual(normalize_phone_number("8296387497"), "+918296387497")
        self.assertEqual(normalize_phone_number("9876543210"), "+919876543210")
        # 12-digit Indian mobile without plus
        self.assertEqual(normalize_phone_number("918296387497"), "+918296387497")
        # International with plus and spaces/dashes
        self.assertEqual(normalize_phone_number("+91 8296-387-497"), "+918296387497")
        self.assertEqual(normalize_phone_number("+1 (415) 555-2671"), "+14155552671")

    @patch.dict(os.environ, {"SMS_TO_NUMBER": "+918296387497"})
    def test_default_recipient_from_env(self):
        service = NotificationSettingsService()
        self.assertEqual(service.get_sms_recipient(), "+918296387497")
        self.assertEqual(service.get_setting_source(), "environment")

        resp = self.client.get("/api/v1/settings/notifications")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()["settings"]
        self.assertEqual(data["sms_recipient_number"], "+918296387497")
        self.assertEqual(data["source"], "environment")
        self.assertIn("+9182", data["masked_recipient"])

    @patch.dict(os.environ, {"SMS_TO_NUMBER": "+918296387497"})
    def test_admin_update_valid_e164_persists(self):
        resp = self.client.put(
            "/api/v1/settings/notifications",
            json={"sms_recipient_number": "+919988776655"},
            headers={"X-User-Role": "admin"}
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()["settings"]
        self.assertEqual(data["sms_recipient_number"], "+919988776655")
        self.assertEqual(data["source"], "dashboard")

        # Verify DB directly
        db = SessionLocal()
        try:
            row = db.query(NotificationSetting).filter(NotificationSetting.key == SMS_RECIPIENT_KEY).first()
            self.assertIsNotNone(row)
            self.assertEqual(row.value, "+919988776655")
        finally:
            db.close()

        # Verify persistent service re-instantiation
        fresh_service = NotificationSettingsService()
        self.assertEqual(fresh_service.get_sms_recipient(), "+919988776655")
        self.assertEqual(fresh_service.get_setting_source(), "dashboard")

    @patch.dict(os.environ, {"SMS_TO_NUMBER": "+918296387497"})
    def test_admin_update_indian_10_digit_auto_normalized(self):
        resp = self.client.put(
            "/api/v1/settings/notifications",
            json={"sms_recipient_number": "9123456789"},
            headers={"X-User-Role": "operator"}
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()["settings"]
        self.assertEqual(data["sms_recipient_number"], "+919123456789")

    @patch.dict(os.environ, {"SMS_TO_NUMBER": "+918296387497"})
    def test_invalid_phone_rejected_without_overwriting_valid(self):
        # 1. First set valid number
        service = NotificationSettingsService()
        service.update_sms_recipient("+918296387497", "admin")

        # 2. Try invalid inputs
        for invalid_input in ["", "   ", "123", "invalid-phone", "++918888"]:
            resp = self.client.put(
                "/api/v1/settings/notifications",
                json={"sms_recipient_number": invalid_input},
                headers={"X-User-Role": "admin"}
            )
            self.assertEqual(resp.status_code, 400)

        # 3. Verify existing valid number is preserved
        self.assertEqual(service.get_sms_recipient(), "+918296387497")

    def test_role_authorization_rejection(self):
        for role in ["viewer", "guest", "readonly", "unauthorized"]:
            resp = self.client.put(
                "/api/v1/settings/notifications",
                json={"sms_recipient_number": "+919876543210"},
                headers={"X-User-Role": role}
            )
            self.assertEqual(resp.status_code, 403)
            self.assertIn("Administrator or Operator privileges required", resp.json()["detail"])

    @patch.dict(os.environ, {
        "TEXTBEE_API_KEY": "super-secret-api-key-12345",
        "TEXTBEE_DEVICE_ID": "secret-device-id-98765",
        "SMS_TO_NUMBER": "+918296387497"
    })
    def test_secrets_never_leaked_in_settings_api(self):
        resp = self.client.get("/api/v1/settings/notifications")
        self.assertEqual(resp.status_code, 200)
        body_text = resp.text
        self.assertNotIn("super-secret-api-key-12345", body_text)
        self.assertNotIn("secret-device-id-98765", body_text)
        data = resp.json()["settings"]
        self.assertNotIn("textbee_api_key", data)
        self.assertNotIn("textbee_device_id", data)
        self.assertNotIn("api_key", data)
        self.assertNotIn("device_id", data)

    @patch('services.sms_service.requests.post')
    @patch.dict(os.environ, {
        "SMS_ENABLED": "true",
        "TEXTBEE_API_KEY": "dummy_key",
        "TEXTBEE_DEVICE_ID": "dummy_device",
        "SMS_TO_NUMBER": "+911111111111"
    })
    def test_sms_service_uses_dynamically_saved_number(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"status": "success", "data": {"batchId": "BATCH-DYNAMIC-01"}}
        mock_post.return_value = mock_resp

        # Update number via settings service
        service = NotificationSettingsService()
        service.update_sms_recipient("+918296387497", "admin")

        sms = SMSService()
        self.assertEqual(sms.get_recipient_number(), "+918296387497")

        # Send SMS without explicit to_number
        result = sms.send_sms("CRITICAL DISTRESS ALERT", incident_id="INC-DYNAMIC-01")
        self.assertTrue(result)

        mock_post.assert_called_once()
        call_kwargs = mock_post.call_args[1]
        self.assertEqual(call_kwargs["json"]["recipients"], ["+918296387497"])
        self.assertEqual(call_kwargs["json"]["message"], "CRITICAL DISTRESS ALERT")

    @patch('services.sms_service.requests.post')
    @patch.dict(os.environ, {
        "SMS_ENABLED": "true",
        "ENABLE_SMS_ALERTS": "true",
        "ENABLE_EMAIL_ALERTS": "false",
        "ENABLE_PHONE_CALL_ALERTS": "false",
        "TEXTBEE_API_KEY": "dummy_key",
        "TEXTBEE_DEVICE_ID": "dummy_device",
        "SMS_TO_NUMBER": "+911111111111"
    })
    def test_alert_dispatcher_uses_dynamically_saved_number(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"status": "success", "data": {"batchId": "BATCH-DISPATCH-99"}}
        mock_post.return_value = mock_resp

        # Dynamically set new recipient
        service = NotificationSettingsService()
        service.update_sms_recipient("+918296387497", "admin")

        dispatcher = AlertDispatcher()
        job = {
            "incident_id": "INC-DYNAMIC-DISPATCH-99",
            "source_key": "CAM-01",
            "threat_type": "Violence",
            "confidence": 95.0,
            "risk_level": "CRITICAL",
            "model1_pred": "Violence",
            "model1_conf": 95.0,
            "model2_pred": "Normal",
            "model2_conf": 0.0,
            "persons": [{"person_id": 1, "gender": "Female", "distress": True}],
            "video_path": "outputs/test_video.mp4",
            "snapshot_path": None,
            "location_data": {"latitude": 12.9716, "longitude": 77.5946}
        }

        # Dispatch should pick up dynamic recipient "+918296387497"
        dispatcher._dispatch_job_async(job)

        # Wait briefly for concurrent SMS thread to complete
        import time
        time.sleep(0.5)

        self.assertTrue(mock_post.called)
        call_kwargs = mock_post.call_args[1]
        self.assertEqual(call_kwargs["json"]["recipients"], ["+918296387497"])

    @patch.dict(os.environ, {"SMS_TO_NUMBER": "+918296387497"})
    def test_reset_recipient_restores_env_default(self):
        service = NotificationSettingsService()
        service.update_sms_recipient("+919999999999", "admin")
        self.assertEqual(service.get_sms_recipient(), "+919999999999")
        self.assertEqual(service.get_setting_source(), "dashboard")

        # Reset via DELETE API
        resp = self.client.delete("/api/v1/settings/notifications/recipient", headers={"X-User-Role": "admin"})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()["settings"]
        self.assertEqual(data["sms_recipient_number"], "+918296387497")
        self.assertEqual(data["source"], "environment")

        # Verify DB is cleared
        self.assertEqual(service.get_sms_recipient(), "+918296387497")
        self.assertEqual(service.get_setting_source(), "environment")

    @patch('services.sms_service.requests.post')
    @patch.dict(os.environ, {
        "SMS_ENABLED": "true",
        "TEXTBEE_API_KEY": "key123",
        "TEXTBEE_DEVICE_ID": "device123",
        "SMS_TO_NUMBER": "+918296387497"
    })
    def test_test_sms_endpoint(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"status": "success", "data": {"batchId": "TEST-BATCH-001"}}
        mock_post.return_value = mock_resp

        resp = self.client.post(
            "/api/v1/settings/notifications/test-sms",
            json={"recipient": "+918296387497"},
            headers={"X-User-Role": "admin"}
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["status"], "success")
        self.assertIn("Test SMS successfully dispatched", resp.json()["message"])

if __name__ == "__main__":
    unittest.main()

import os
import unittest
from unittest.mock import patch, MagicMock

from services.sms_service import SMSService

class TestSMSService(unittest.TestCase):
    
    @patch.dict(os.environ, {"SMS_ENABLED": "false", "TEXTBEE_API_KEY": "key123"})
    def test_sms_disabled_returns_false(self):
        sms = SMSService()
        self.assertFalse(sms.enabled)
        
        result = sms.send_sms("Test message", "+987654321")
        self.assertFalse(result)

    @patch.dict(os.environ, {"SMS_ENABLED": "true", "TEXTBEE_API_KEY": ""})
    def test_sms_enabled_but_not_configured_graceful_fallback(self):
        sms = SMSService()
        # Should gracefully disable itself because config is missing
        self.assertFalse(sms.enabled)

        result = sms.send_sms("Test message", "+987654321")
        self.assertFalse(result)

    @patch('services.sms_service.requests.post')
    @patch.dict(os.environ, {"SMS_ENABLED": "true", "TEXTBEE_API_KEY": "key123", "TEXTBEE_DEVICE_ID": "device123"})
    def test_sms_successful_dispatch(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"status": "success"}
        mock_post.return_value = mock_resp
        
        sms = SMSService()
        self.assertTrue(sms.enabled)
        
        result = sms.send_sms("SAFETY ALERT: Violence", "+987654321")
        self.assertTrue(result)
        mock_post.assert_called_once_with(
            "https://api.textbee.dev/api/v1/gateway/send-sms",
            json={"recipients": ["+987654321"], "message": "SAFETY ALERT: Violence", "deviceId": "device123"},
            headers={"x-api-key": "key123", "Content-Type": "application/json"},
            timeout=30.0
        )

    @patch('services.sms_service.requests.post')
    @patch.dict(os.environ, {"SMS_ENABLED": "true", "TEXTBEE_API_KEY": "key123"})
    def test_sms_http_error_handled_gracefully(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 400
        mock_resp.text = "Bad Request"
        mock_post.return_value = mock_resp
        
        sms = SMSService()
        result = sms.send_sms("SAFETY ALERT", "+987654321")
        
        self.assertFalse(result)
        mock_post.assert_called_once()

    @patch('services.sms_service.requests.post')
    @patch.dict(os.environ, {"SMS_ENABLED": "true", "TEXTBEE_API_KEY": "key123"})
    def test_sms_network_timeout_handled_gracefully(self, mock_post):
        import requests
        mock_post.side_effect = requests.exceptions.Timeout("Connection timed out")
        
        sms = SMSService()
        result = sms.send_sms("SAFETY ALERT", "+987654321")
        
        self.assertFalse(result)
        mock_post.assert_called_once()

    @patch('services.sms_service.requests.post')
    @patch.dict(os.environ, {"SMS_ENABLED": "true", "TEXTBEE_API_KEY": "key123", "SMS_TO_NUMBER": ""})
    def test_sms_without_recipient_returns_false(self, mock_post):
        # SMS_TO_NUMBER is empty in env by default here
        sms = SMSService()
        result = sms.send_sms("Test message", to_number=None)
        
        self.assertFalse(result)
        mock_post.assert_not_called()

if __name__ == '__main__':
    unittest.main()

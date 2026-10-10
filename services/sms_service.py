import os
import logging
import requests
from typing import Dict, Any, List

logger = logging.getLogger("sms_service")

class SMSService:
    def __init__(self):
        self.enabled = os.environ.get("SMS_ENABLED", "false").lower() in ("true", "1", "yes")
        self.api_key = os.environ.get("TEXTBEE_API_KEY", "").strip()
        self.device_id = os.environ.get("TEXTBEE_DEVICE_ID", "").strip()
        
        self.api_url = "https://api.textbee.dev/api/v1/gateway/send-sms"
        
        if self.enabled and not self.api_key:
            logger.warning("[SMSService] SMS is enabled but TEXTBEE_API_KEY configuration is missing. SMS will not be sent.")
            self.enabled = False

    def send_sms(self, message: str, to_number: str = None) -> bool:
        """
        Sends an SMS message using the TextBee API.
        Returns True if successful, False otherwise.
        """
        if not self.enabled:
            logger.info("[SMSService] SMS is disabled or unconfigured; skipping SMS dispatch.")
            return False

        # Read fallback recipient from environment if not provided explicitly
        recipient = to_number or os.environ.get("SMS_TO_NUMBER", "").strip()
        
        if not recipient:
            logger.warning("[SMSService] No destination phone number configured for SMS.")
            return False

        headers = {
            "x-api-key": self.api_key,
            "Content-Type": "application/json"
        }
        
        payload = {
            "recipients": [recipient],
            "message": message
        }
        
        if self.device_id:
            payload["deviceId"] = self.device_id

        try:
            response = requests.post(self.api_url, json=payload, headers=headers, timeout=30.0)
            
            if response.status_code == 200:
                resp_json = response.json()
                logger.info(f"[SMSService] SMS successfully dispatched to {recipient}. TextBee Response: {resp_json}")
                return True
            else:
                logger.error(f"[SMSService] TextBee API Error ({response.status_code}): {response.text}")
                return False
                
        except requests.exceptions.RequestException as e:
            logger.error(f"[SMSService] Network error sending SMS via TextBee: {e}")
            return False
        except Exception as e:
            logger.error(f"[SMSService] Unexpected error sending SMS: {e}")
            return False

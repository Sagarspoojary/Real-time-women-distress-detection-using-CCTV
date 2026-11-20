import os
import time
import logging
import requests
from typing import Dict, Any, List, Optional
try:
    from dotenv import load_dotenv
    load_dotenv(override=False)
except ImportError:
    pass
from services.phone_notification_service import mask_phone_number

logger = logging.getLogger("sms_service")

class SMSService:
    def __init__(self):
        self.enabled = (
            os.environ.get("SMS_ENABLED") or os.environ.get("ENABLE_SMS_ALERTS") or "false"
        ).lower() in ("true", "1", "yes")
        self.api_key = os.environ.get("TEXTBEE_API_KEY", "").strip()
        self.device_id = os.environ.get("TEXTBEE_DEVICE_ID", "").strip()
        
        self.api_url = "https://api.textbee.dev/api/v1/gateway/send-sms"
        self.last_result: Dict[str, Any] = {}
        
        if self.enabled and not self.api_key:
            logger.warning("[SMSService] SMS is enabled but TEXTBEE_API_KEY configuration is missing. SMS will not be sent.")
            self.enabled = False

    def get_recipient_number(self) -> str:
        """
        Dynamically resolves the active SMS recipient phone number using
        NotificationSettingsService (DB -> JSON -> .env SMS_TO_NUMBER).
        """
        try:
            from services.notification_settings_service import notification_settings_service
            recipient = notification_settings_service.get_sms_recipient()
            if recipient:
                return recipient
        except Exception as e:
            logger.debug(f"[SMSService] Error resolving dynamic recipient: {e}")
        return os.environ.get("SMS_TO_NUMBER", "").strip()

    def send_sms(self, message: str, to_number: str = None, incident_id: Optional[str] = None) -> bool:
        """
        Sends an SMS message using the TextBee API.
        Returns True if successful, False otherwise.
        """
        inc_prefix = f"[{incident_id}] " if incident_id else ""
        if not self.enabled:
            logger.info(f"[SMSService] {inc_prefix}SMS is disabled or unconfigured; skipping SMS dispatch.")
            self.last_result = {"status": "SKIPPED", "reason": "disabled_or_unconfigured"}
            return False

        # Dynamically resolve recipient if not provided explicitly
        recipient = to_number or self.get_recipient_number()
        
        if not recipient:
            logger.warning(f"[SMSService] {inc_prefix}No destination phone number configured for SMS.")
            self.last_result = {"status": "SKIPPED", "reason": "no_recipient"}
            return False

        masked_recipient = mask_phone_number(recipient)
        logger.info(f"[SMSService] {inc_prefix}SMS dispatch started to destination {masked_recipient} via TextBee Gateway")

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

        t0 = time.perf_counter()
        try:
            response = requests.post(self.api_url, json=payload, headers=headers, timeout=30.0)
            elapsed_ms = (time.perf_counter() - t0) * 1000.0
            
            status_code = response.status_code
            logger.info(f"[SMSService] {inc_prefix}TextBee HTTP response status: {status_code} in {elapsed_ms:.1f}ms")

            if status_code == 200:
                try:
                    resp_json = response.json()
                except Exception:
                    resp_json = {}

                batch_id = None
                if isinstance(resp_json, dict):
                    data_field = resp_json.get("data")
                    if isinstance(data_field, dict):
                        batch_id = data_field.get("batchId") or data_field.get("id") or data_field.get("batch_id")
                    if not batch_id:
                        batch_id = resp_json.get("batchId") or resp_json.get("id") or resp_json.get("batch_id") or "N/A"

                logger.info(f"[SMSService] {inc_prefix}SMS request accepted by TextBee (Batch ID: {batch_id}) for {masked_recipient}")
                logger.info(f"[SMSService] {inc_prefix}SMS delivery status unknown (provider does not return handset delivery receipts synchronously)")

                self.last_result = {
                    "status": "ACCEPTED",
                    "status_code": status_code,
                    "batch_id": batch_id,
                    "elapsed_ms": elapsed_ms,
                    "delivery_status": "unknown"
                }
                return True
            else:
                logger.error(f"[SMSService] {inc_prefix}TextBee API Error ({status_code}) in {elapsed_ms:.1f}ms: {response.text}")
                self.last_result = {
                    "status": "FAILED",
                    "status_code": status_code,
                    "elapsed_ms": elapsed_ms,
                    "error": response.text
                }
                return False
                
        except requests.exceptions.RequestException as e:
            elapsed_ms = (time.perf_counter() - t0) * 1000.0
            logger.error(f"[SMSService] {inc_prefix}Network error sending SMS via TextBee after {elapsed_ms:.1f}ms: {e}")
            self.last_result = {"status": "NETWORK_ERROR", "elapsed_ms": elapsed_ms, "error": str(e)}
            return False
        except Exception as e:
            elapsed_ms = (time.perf_counter() - t0) * 1000.0
            logger.error(f"[SMSService] {inc_prefix}Unexpected error sending SMS after {elapsed_ms:.1f}ms: {e}")
            self.last_result = {"status": "UNEXPECTED_ERROR", "elapsed_ms": elapsed_ms, "error": str(e)}
            return False


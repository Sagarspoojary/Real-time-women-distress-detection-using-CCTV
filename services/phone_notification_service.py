"""
PhoneNotificationService — Provider-Independent SMS & Alert Dispatcher (Fast2SMS)
==================================================================================

Responsibilities:
1. Validate E.164 phone numbers (e.g. +919876543210).
2. Mask phone numbers in logs to preserve security (e.g. +9198****3210).
3. Send SMS broadcasts using Fast2SMS API for Indian 10-digit mobile numbers.
4. Support mock mode for development / unit testing when API key is unconfigured.
5. Parse full Fast2SMS error bodies (e.g. 416: Insufficient wallet balance, 411: Invalid numbers).
6. Provide clean interface for future WhatsApp Cloud API integration.
7. Handle voice calls as disabled/optional without crashing the pipeline.
8. Provide isolated failure handling so errors do not propagate to the main AI pipeline.
"""

import os
import re
import logging
from typing import List, Dict, Any, Tuple
import requests

logger = logging.getLogger("phone_notification_service")


FAST2SMS_ERROR_CODES = {
    400: "Bad Request",
    401: "Unauthorized / Invalid Key",
    411: "Invalid numbers",
    412: "Invalid authentication",
    413: "Authorization key disabled",
    414: "IP blacklisted",
    416: "Insufficient wallet balance",
    417: "Unicode or language format issue",
    995: "Spamming detected",
    999: "Minimum transaction requirement not met"
}


def mask_phone_number(phone: str) -> str:
    """
    Mask phone number for safe logging.
    Example: '+919876543210' -> '+9198****3210'
             '+14155552671' -> '+1415****2671'
    """
    if not phone:
        return ""
    clean = phone.strip()
    if len(clean) <= 7:
        return "****"
    prefix_len = 5 if clean.startswith("+") else 3
    suffix_len = 4
    if len(clean) <= prefix_len + suffix_len:
        return clean[:prefix_len] + "****"
    return clean[:prefix_len] + "*" * (len(clean) - prefix_len - suffix_len) + clean[-suffix_len:]


def is_valid_e164(phone: str) -> bool:
    """
    Strict E.164 validation: starts with '+', followed by 7 to 15 digits.
    """
    if not phone or not isinstance(phone, str):
        return False
    pattern = r"^\+[1-9]\d{6,14}$"
    return bool(re.match(pattern, phone.strip()))


class PhoneNotificationService:
    def __init__(self):
        self.provider = os.environ.get("SMS_PROVIDER", "fast2sms").strip().lower()
        self.fast2sms_api_key = os.environ.get("FAST2SMS_API_KEY", "").strip()
        self.enable_sms = os.environ.get("ENABLE_SMS_ALERTS", "true").lower() in ("true", "1", "yes")
        self.enable_whatsapp = os.environ.get("ENABLE_WHATSAPP_ALERTS", "false").lower() in ("true", "1", "yes")
        self.enable_call = os.environ.get("ENABLE_CALL_ALERTS", "false").lower() in ("true", "1", "yes")

    def is_configured(self) -> bool:
        """Returns True if Fast2SMS API key is configured."""
        return bool(self.fast2sms_api_key)

    def normalize_for_fast2sms(self, phone: str) -> Tuple[bool, str]:
        """
        Normalizes E.164 phone number to 10-digit Indian mobile number for Fast2SMS.
        Example: '+918971175397' -> (True, '8971175397')
                 '8971175397'   -> (True, '8971175397')
        Returns (is_valid, 10_digit_str).
        """
        clean = re.sub(r"[\s\-\(\)]", "", phone.strip()) if phone else ""

        if clean.startswith("+91"):
            digits = clean[3:]
        elif clean.startswith("91") and len(clean) == 12:
            digits = clean[2:]
        elif clean.startswith("0") and len(clean) == 11:
            digits = clean[1:]
        elif clean.startswith("+"):
            digits = clean[1:]
        else:
            digits = clean

        # Validate 10-digit Indian mobile format (starts with 6-9)
        if len(digits) == 10 and digits.isdigit() and digits[0] in "6789":
            return True, digits

        return False, digits

    def send_sms_alert(self, phone_numbers: List[str], message: str) -> Dict[str, Any]:
        """
        Send SMS alert message to multiple phone numbers using Fast2SMS API.
        Returns structured dict summarizing per-recipient delivery statuses.
        """
        results = []
        if not phone_numbers:
            return {"success": False, "channel": "sms", "error": "No recipients provided", "results": []}

        if not self.enable_sms:
            logger.info("[PhoneNotificationService] SMS alerts disabled in configuration.")
            return {"success": False, "channel": "sms", "error": "SMS_ALERTS_DISABLED", "results": []}

        # Mock delivery if Fast2SMS API Key is not set or is explicitly set to MOCK/MOCK_KEY
        if not self.fast2sms_api_key or self.fast2sms_api_key == "MOCK" or self.fast2sms_api_key.startswith("MOCK_"):
            logger.info("[PhoneNotificationService] Fast2SMS API key unconfigured — running in MOCK mode.")
            for raw_phone in phone_numbers:
                phone = raw_phone.strip() if raw_phone else ""
                masked = mask_phone_number(phone)
                is_valid_norm, norm_digits = self.normalize_for_fast2sms(phone)

                if not is_valid_e164(phone) or not is_valid_norm:
                    results.append({"phone": masked, "success": False, "error": "INVALID_INDIAN_MOBILE_NUMBER"})
                else:
                    results.append({"phone": masked, "normalized": norm_digits, "success": True, "message_id": "MOCK_FAST2SMS_123456"})
            return {"success": True, "channel": "sms", "provider": "fast2sms_mock", "results": results}

        # Live Fast2SMS Dispatch
        all_success = True
        fast2sms_url = "https://www.fast2sms.com/dev/bulkV2"
        headers = {
            "authorization": self.fast2sms_api_key,
            "Content-Type": "application/json"
        }

        for raw_phone in phone_numbers:
            phone = raw_phone.strip() if raw_phone else ""
            masked = mask_phone_number(phone)

            is_valid_norm, digit_phone = self.normalize_for_fast2sms(phone)

            if not is_valid_e164(phone) or not is_valid_norm:
                logger.warning(f"[PhoneNotificationService] SMS skipped - invalid Indian mobile number: {masked}")
                results.append({"phone": masked, "success": False, "error": "INVALID_INDIAN_MOBILE_NUMBER"})
                all_success = False
                continue

            payload = {
                "route": "q",
                "message": message,
                "language": "english",
                "flash": "0",
                "numbers": digit_phone
            }

            try:
                response = requests.post(fast2sms_url, json=payload, headers=headers, timeout=10)
                try:
                    resp_json = response.json()
                except Exception:
                    resp_json = {}

                if response.status_code == 200 and resp_json.get("return") is True:
                    request_id = resp_json.get("request_id", "OK")
                    logger.info(f"[PhoneNotificationService] Fast2SMS delivered successfully to {masked} | req_id: {request_id}")
                    results.append({"phone": masked, "normalized": digit_phone, "success": True, "request_id": request_id})
                else:
                    # Parse detailed Fast2SMS error response body
                    raw_msg = resp_json.get("message")
                    if isinstance(raw_msg, list) and len(raw_msg) > 0:
                        detail_msg = raw_msg[0]
                    elif isinstance(raw_msg, str):
                        detail_msg = raw_msg
                    else:
                        detail_msg = "Unknown Fast2SMS API error"

                    error_code = resp_json.get("code") or response.status_code
                    code_desc = FAST2SMS_ERROR_CODES.get(error_code, detail_msg)
                    formatted_error = f"HTTP_{response.status_code} FAST2SMS_ERROR_{error_code} - {detail_msg or code_desc}"

                    logger.error(f"[PhoneNotificationService] Fast2SMS failed for {masked}: {formatted_error}")
                    results.append({
                        "phone": masked,
                        "normalized": digit_phone,
                        "success": False,
                        "status_code": response.status_code,
                        "error_code": error_code,
                        "provider_message": detail_msg,
                        "error": formatted_error
                    })
                    all_success = False
            except Exception as e:
                logger.error(f"[PhoneNotificationService] Fast2SMS network error for {masked}: {e}")
                results.append({"phone": masked, "normalized": digit_phone, "success": False, "error": f"NETWORK_ERROR: {str(e)}"})
                all_success = False

        return {"success": all_success, "channel": "sms", "provider": "fast2sms", "results": results}

    def trigger_whatsapp_alert(self, phone_numbers: List[str], message: str) -> Dict[str, Any]:
        """Clean interface for official WhatsApp Cloud API integration."""
        if not self.enable_whatsapp:
            logger.info("[PhoneNotificationService] WhatsApp alerts disabled: no configured provider.")
            return {"success": False, "channel": "whatsapp", "error": "WHATSAPP_DISABLED", "results": []}
        return {"success": False, "channel": "whatsapp", "error": "WHATSAPP_NOT_CONFIGURED", "results": []}

    def trigger_emergency_call(self, phone_numbers: List[str], message: str) -> Dict[str, Any]:
        """Voice calls disabled as paid voice calling is optional."""
        logger.info("[PhoneNotificationService] Voice call disabled: no configured voice provider.")
        results = [{"phone": mask_phone_number(p), "success": False, "error": "VOICE_PROVIDER_DISABLED"} for p in phone_numbers]
        return {"success": False, "channel": "voice", "error": "VOICE_PROVIDER_DISABLED", "results": results}

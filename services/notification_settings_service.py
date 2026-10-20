import os
import re
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from database.database import SessionLocal, engine, Base
from database.models import NotificationSetting
from services.phone_notification_service import is_valid_e164, mask_phone_number

logger = logging.getLogger("notification_settings_service")

SETTINGS_FILE = os.path.join("data", "notification_settings.json")
SMS_RECIPIENT_KEY = "sms_recipient_number"

def normalize_phone_number(raw_number: str) -> str:
    """
    Normalizes a user-entered phone number into standard E.164 format.
    - Strips whitespace, dashes, parentheses, dots.
    - If a 10-digit number is provided (e.g. '8296387497'), automatically prepends '+91'.
    - If a 12-digit number starting with '91' is provided without '+', prepends '+'.
    """
    if not raw_number or not isinstance(raw_number, str):
        return ""
    clean = re.sub(r"[\s\-\(\)\.]", "", raw_number.strip())
    
    # 10-digit Indian mobile number
    if re.match(r"^[6-9]\d{9}$", clean):
        clean = "+91" + clean
    # 12-digit Indian number with country code missing '+'
    elif re.match(r"^91[6-9]\d{9}$", clean):
        clean = "+" + clean
    elif not clean.startswith("+") and clean.isdigit() and len(clean) >= 10:
        clean = "+" + clean
        
    return clean

class NotificationSettingsService:
    def __init__(self):
        os.makedirs("data", exist_ok=True)
        # Ensure database tables exist
        try:
            Base.metadata.create_all(bind=engine)
        except Exception as e:
            logger.debug(f"[NotificationSettings] create_all notice: {e}")

    def get_sms_recipient(self) -> str:
        """
        Dynamically resolves the active SMS recipient number following precedence:
        1. Persisted dashboard setting in SQLite database
        2. Persisted setting in data/notification_settings.json
        3. Environment default (SMS_TO_NUMBER in .env)
        """
        # 1. Try SQLite database
        try:
            db = SessionLocal()
            try:
                setting = db.query(NotificationSetting).filter(NotificationSetting.key == SMS_RECIPIENT_KEY).first()
                if setting and setting.value and setting.value.strip():
                    return setting.value.strip()
            finally:
                db.close()
        except Exception as e:
            logger.debug(f"[NotificationSettings] DB read notice: {e}")

        # 2. Try JSON configuration file
        if os.path.exists(SETTINGS_FILE):
            try:
                with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    val = data.get(SMS_RECIPIENT_KEY)
                    if val and str(val).strip():
                        return str(val).strip()
            except Exception as e:
                logger.debug(f"[NotificationSettings] JSON read notice: {e}")

        # 3. Fallback to environment default
        env_val = os.environ.get("SMS_TO_NUMBER", "").strip()
        return env_val

    def get_setting_source(self) -> str:
        """Returns 'dashboard' if a persisted setting exists, otherwise 'environment'."""
        try:
            db = SessionLocal()
            try:
                setting = db.query(NotificationSetting).filter(NotificationSetting.key == SMS_RECIPIENT_KEY).first()
                if setting and setting.value and setting.value.strip():
                    return "dashboard"
            finally:
                db.close()
        except Exception:
            pass

        if os.path.exists(SETTINGS_FILE):
            try:
                with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if data.get(SMS_RECIPIENT_KEY):
                        return "dashboard"
            except Exception:
                pass

        return "environment"

    def update_sms_recipient(self, raw_number: str, updated_by: str = "admin") -> Dict[str, Any]:
        """
        Validates, normalizes, and persists the SMS recipient phone number.
        Rejects invalid numbers without modifying the existing valid configuration.
        """
        if not raw_number or not raw_number.strip():
            raise ValueError("Phone number cannot be empty.")

        normalized = normalize_phone_number(raw_number)
        if not is_valid_e164(normalized):
            raise ValueError(
                f"Invalid phone number '{raw_number}'. Must be a valid E.164 number with country code (e.g. +918296387497 or +14155552671)."
            )

        now_iso = datetime.now(timezone.utc).isoformat()

        # 1. Persist to database
        db = SessionLocal()
        try:
            setting = db.query(NotificationSetting).filter(NotificationSetting.key == SMS_RECIPIENT_KEY).first()
            if setting:
                setting.value = normalized
                setting.updated_at = now_iso
                setting.updated_by = updated_by
            else:
                setting = NotificationSetting(
                    key=SMS_RECIPIENT_KEY,
                    value=normalized,
                    updated_at=now_iso,
                    updated_by=updated_by
                )
                db.add(setting)
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"[NotificationSettings] Failed to save setting to DB: {e}")
            raise RuntimeError(f"Database error saving setting: {e}")
        finally:
            db.close()

        # 2. Persist to JSON file for high-resilience file backup
        try:
            file_data = {}
            if os.path.exists(SETTINGS_FILE):
                try:
                    with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                        file_data = json.load(f)
                except Exception:
                    file_data = {}
            file_data[SMS_RECIPIENT_KEY] = normalized
            file_data["updated_at"] = now_iso
            file_data["updated_by"] = updated_by
            with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
                json.dump(file_data, f, indent=4)
        except Exception as e:
            logger.warning(f"[NotificationSettings] Failed to update settings JSON backup: {e}")

        masked = mask_phone_number(normalized)
        logger.info(f"[NotificationSettings] SMS recipient updated to {masked} by {updated_by}")

        return self.get_settings_summary()

    def reset_sms_recipient(self, updated_by: str = "admin") -> Dict[str, Any]:
        """Resets the recipient setting back to the environment variable default."""
        try:
            db = SessionLocal()
            try:
                setting = db.query(NotificationSetting).filter(NotificationSetting.key == SMS_RECIPIENT_KEY).first()
                if setting:
                    db.delete(setting)
                    db.commit()
            finally:
                db.close()
        except Exception as e:
            logger.warning(f"[NotificationSettings] Error resetting DB setting: {e}")

        if os.path.exists(SETTINGS_FILE):
            try:
                with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                    file_data = json.load(f)
                file_data.pop(SMS_RECIPIENT_KEY, None)
                with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
                    json.dump(file_data, f, indent=4)
            except Exception as e:
                logger.warning(f"[NotificationSettings] Error resetting JSON setting: {e}")

        logger.info(f"[NotificationSettings] SMS recipient reset to environment default by {updated_by}")
        return self.get_settings_summary()

    def get_settings_summary(self) -> Dict[str, Any]:
        """
        Returns the non-sensitive notification settings summary for dashboard consumers.
        Secrets (API key and Device ID) are strictly omitted.
        """
        recipient = self.get_sms_recipient()
        masked = mask_phone_number(recipient) if recipient else "Not configured"
        source = self.get_setting_source()
        
        sms_enabled = (
            os.environ.get("SMS_ENABLED") or os.environ.get("ENABLE_SMS_ALERTS") or "false"
        ).lower() in ("true", "1", "yes")

        textbee_key = os.environ.get("TEXTBEE_API_KEY", "").strip()
        textbee_device = os.environ.get("TEXTBEE_DEVICE_ID", "").strip()
        textbee_configured = bool(textbee_key and textbee_device)

        updated_at = None
        try:
            db = SessionLocal()
            try:
                setting = db.query(NotificationSetting).filter(NotificationSetting.key == SMS_RECIPIENT_KEY).first()
                if setting:
                    updated_at = setting.updated_at
            finally:
                db.close()
        except Exception:
            pass

        return {
            "sms_enabled": sms_enabled,
            "sms_recipient_number": recipient,
            "masked_recipient": masked,
            "source": source,
            "updated_at": updated_at,
            "textbee_configured": textbee_configured
        }

notification_settings_service = NotificationSettingsService()

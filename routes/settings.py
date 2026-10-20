import os
import logging
from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Header, Depends, Body
from pydantic import BaseModel

from services.notification_settings_service import notification_settings_service
from services.sms_service import SMSService

logger = logging.getLogger("settings_route")
router = APIRouter()

class NotificationSettingPayload(BaseModel):
    sms_recipient_number: str

class TestSMSPayload(BaseModel):
    recipient: Optional[str] = None

def verify_admin_role(x_user_role: Optional[str] = Header(None, alias="X-User-Role")) -> str:
    """
    Enforces role-based access control.
    Non-privileged roles ('viewer', 'guest', 'readonly') are rejected with 403 Forbidden.
    """
    if x_user_role:
        role = x_user_role.strip().lower()
        if role in ("viewer", "guest", "readonly", "unauthorized"):
            logger.warning(f"[Settings] Unauthorized attempt by role '{x_user_role}'")
            raise HTTPException(
                status_code=403,
                detail="Administrator or Operator privileges required to modify notification settings."
            )
        return role
    return "admin"

@router.get("/settings/notifications")
async def get_notification_settings():
    """
    Retrieves current notification settings summary for dashboard display.
    API keys and secrets are never returned.
    """
    try:
        summary = notification_settings_service.get_settings_summary()
        return {
            "status": "success",
            "settings": summary
        }
    except Exception as e:
        logger.error(f"[Settings] Failed to fetch settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/settings/notifications")
async def update_notification_settings(
    payload: NotificationSettingPayload,
    user_role: str = Depends(verify_admin_role)
):
    """
    Updates the SMS recipient number with persistence and validation.
    Rejects malformed numbers with 400 Bad Request without modifying existing valid settings.
    """
    try:
        updated_summary = notification_settings_service.update_sms_recipient(
            raw_number=payload.sms_recipient_number,
            updated_by=user_role
        )
        return {
            "status": "success",
            "message": "SMS recipient phone number updated successfully.",
            "settings": updated_summary
        }
    except ValueError as e:
        logger.warning(f"[Settings] Invalid phone number rejected: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"[Settings] Error saving notification settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/settings/notifications/recipient")
async def reset_notification_recipient(
    user_role: str = Depends(verify_admin_role)
):
    """
    Resets the dashboard custom SMS recipient override back to the environment variable default.
    """
    try:
        reset_summary = notification_settings_service.reset_sms_recipient(updated_by=user_role)
        return {
            "status": "success",
            "message": "SMS recipient reset to system environment default.",
            "settings": reset_summary
        }
    except Exception as e:
        logger.error(f"[Settings] Error resetting recipient: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/settings/notifications/test-sms")
async def send_test_sms(
    payload: Optional[TestSMSPayload] = Body(default=None),
    user_role: str = Depends(verify_admin_role)
):
    """
    Dispatches a safe verification test SMS message to confirm TextBee gateway connectivity.
    """
    sms_service = SMSService()
    target_number = (payload.recipient if payload and payload.recipient else None) or sms_service.get_recipient_number()

    if not target_number:
        raise HTTPException(
            status_code=400,
            detail="No recipient phone number is configured. Please provide or configure a recipient."
        )

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    test_message = (
        f"[Women Distress AI] Test verification SMS: Emergency SMS notification channel is operational.\n"
        f"Timestamp: {timestamp}\n"
        f"Recipient Verified."
    )

    try:
        success = sms_service.send_sms(test_message, to_number=target_number, incident_id="TEST-VERIFICATION")
        meta = getattr(sms_service, "last_result", {})
        
        if success:
            return {
                "status": "success",
                "message": f"Test SMS successfully dispatched via TextBee.",
                "details": meta
            }
        else:
            reason = meta.get("reason") or meta.get("error") or "SMS dispatch skipped or unaccepted"
            raise HTTPException(
                status_code=502 if meta.get("status") == "FAILED" else 400,
                detail=f"Failed to send test SMS: {reason}"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Settings] Unexpected test SMS error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

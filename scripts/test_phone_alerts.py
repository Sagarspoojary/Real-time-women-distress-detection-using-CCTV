"""
Standalone CLI script to test live or mocked Fast2SMS alerts with detailed error output.
"""
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from dotenv import load_dotenv
load_dotenv(override=True)

from services.phone_notification_service import PhoneNotificationService, is_valid_e164, mask_phone_number


def main():
    print("=========================================================")
    print(" Fast2SMS Alert Test Utility")
    print("=========================================================")

    service = PhoneNotificationService()
    provider_name = service.provider.upper()
    mode = "LIVE" if service.is_configured() else "MOCK"

    print(f"Provider : {provider_name}")
    print(f"Mode     : {mode}")
    print(f"API Key  : {'[SET]' if service.is_configured() else '[UNSET - USING MOCK MODE]'}")
    print("---------------------------------------------------------")

    raw_input_phone = input("Enter target phone number in E.164 format (e.g. +919876543210): ").strip()
    target_phone = raw_input_phone if raw_input_phone else "+919876543210"

    e164_ok = is_valid_e164(target_phone)
    is_valid_norm, norm_digits = service.normalize_for_fast2sms(target_phone)
    masked = mask_phone_number(target_phone)

    print(f"E.164 validation         : {'PASS' if e164_ok else 'FAIL'}")
    print(f"Normalized Fast2SMS number: {norm_digits if is_valid_norm else 'INVALID (' + norm_digits + ')'}")
    print(f"Masked phone             : {masked}")

    # 1. SMS Test via Fast2SMS
    print("\n--- 1. Testing Fast2SMS Dispatch ---")
    sms_msg = "EMERGENCY ALERT: Violence/Distress detected at Camera CAM-01. Immediate attention required. Incident ID: TEST-001"
    sms_res = service.send_sms_alert([target_phone], sms_msg)

    print("\nFast2SMS Response Result:")
    if sms_res.get("success"):
        print("Status     : SUCCESS")
        print("Details    :", sms_res)
    else:
        print("Status     : FAILED")
        for res_item in sms_res.get("results", []):
            if res_item.get("status_code"):
                print(f"HTTP Status    : {res_item.get('status_code')}")
                print(f"Provider Error : {res_item.get('error_code')}")
                print(f"Message        : {res_item.get('provider_message')}")
            else:
                print(f"Error          : {res_item.get('error')}")

    # 2. Voice Call Test (Disabled status check)
    print("\n--- 2. Voice Call Status Check ---")
    voice_res = service.trigger_emergency_call([target_phone], "Voice test message")
    print("Voice Call Status:", voice_res.get("error"))

    print("\nTest completed.")

if __name__ == "__main__":
    main()

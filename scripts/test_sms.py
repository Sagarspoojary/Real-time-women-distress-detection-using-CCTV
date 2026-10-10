import os
import sys

# Ensure backend root is in PYTHONPATH
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from dotenv import load_dotenv
from services.sms_service import SMSService

def test_sms():
    print("Loading environment variables...")
    load_dotenv()
    
    print("Initializing SMS Service...")
    sms = SMSService()
    
    if not sms.enabled:
        print("ERROR: SMS is not configured or SMS_ENABLED is not set to true.")
        print("Please check your .env configuration for TextBee variables.")
        return

    print("TextBee configuration: OK")
    if sms.device_id:
        print(f"TextBee gateway (Device ID): CONFIGURED")
    else:
        print("TextBee gateway (Device ID): NOT CONFIGURED (Will use default if any)")
        
    print("Sending test SMS...")
    
    test_message = (
        "EMERGENCY ALERT: Test Incident Detected\n"
        "Risk Level: CRITICAL\n"
        "Confidence: 99%\n"
        "Camera: Main Entrance (CAM-TEST)\n"
        "Time: 2026-10-07 10:30:22 IST\n\n"
        "AI Summary: Test threat behaviour confirmed.\n\n"
        "Persons Detected: 1\n"
        "Gender Summary: 1 Female\n"
        "GPS Location: N/A\n\n"
        "Incident ID: INC-TEST-0001\n"
        "Immediate action required."
    )
    
    success = sms.send_sms(test_message)
    if success:
        print("SMS request accepted. API ACCEPTED.")
        print("Note: This means the API accepted the request. Check your phone to verify PHONE DELIVERY VERIFIED.")
    else:
        print("Failed to send test SMS via TextBee API.")

if __name__ == "__main__":
    test_sms()

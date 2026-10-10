import os
from services.sms_service import SMSService
from dotenv import load_dotenv

load_dotenv()

sms = SMSService()
print(f"SMS Enabled: {sms.enabled}")
if not sms.enabled:
    print("Cannot test, SMS is not fully enabled in .env")
else:
    print("Sending test SMS via TextBee...")
    success = sms.send_sms("Test message from Antigravity")
    if success:
        print("Success! SMS was sent.")
    else:
        print("Failed to send SMS.")

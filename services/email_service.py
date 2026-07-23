import os
import smtplib
import logging
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Create dedicated logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("email_service")

class EmailService:
    def __init__(self):
        self.smtp_server = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.environ.get("SMTP_PORT", "587"))
        self.smtp_username = os.environ.get("SMTP_USERNAME", "")
        self.smtp_password = os.environ.get("SMTP_PASSWORD", "")
        self.email_from = os.environ.get("EMAIL_FROM", "")

    def send_emergency_email(self, recipients, subject, body_content):
        # Validate recipients and deduplicate (preserving order).
        # Deduplication is important during DEV_MODE where all four slots
        # may hold the same test address — we only want one email delivered.
        seen = set()
        valid_recipients = []
        for r in recipients:
            addr = r.strip() if r else ""
            if addr and addr not in seen:
                seen.add(addr)
                valid_recipients.append(addr)
        if not valid_recipients:
            raise ValueError("No contacts configured.")

        # Setup email MIME structure
        msg = MIMEMultipart()
        msg["From"] = self.email_from
        msg["To"] = ", ".join(valid_recipients)
        msg["Subject"] = subject
        msg.attach(MIMEText(body_content, "plain"))

        time_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        try:
            # Connect to SMTP server
            server = smtplib.SMTP(self.smtp_server, self.smtp_port, timeout=10)
            server.starttls()
            
            # Authenticate if credentials are provided
            if self.smtp_username and self.smtp_password:
                server.login(self.smtp_username, self.smtp_password)
                
            server.sendmail(self.email_from, valid_recipients, msg.as_string())
            server.quit()

            # Audit log success without exposing password credentials
            logger.info(f"[{time_str}] Emergency email broadcasted successfully to {valid_recipients}")
            return len(valid_recipients)
        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"[{time_str}] SMTP Authentication failure: {e}")
            raise RuntimeError("SMTP authentication failed")
        except Exception as e:
            logger.error(f"[{time_str}] SMTP transmission failure: {e}")
            raise e

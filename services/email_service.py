import os
import smtplib
import logging
import mimetypes
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders

# Create dedicated logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("email_service")


class EmailService:
    def __init__(self):
        self.smtp_server = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.environ.get("SMTP_PORT", "587"))
        # Support both SMTP_USERNAME and SMTP_EMAIL for flexibility
        self.smtp_username = os.environ.get("SMTP_USERNAME", "") or os.environ.get("SMTP_EMAIL", "")
        self.smtp_password = os.environ.get("SMTP_PASSWORD", "")
        self.email_from = os.environ.get("EMAIL_FROM", "") or self.smtp_username

    # ─────────────────────────────────────────────────────────────────────
    # INTERNAL: shared SMTP connection + send helper
    # ─────────────────────────────────────────────────────────────────────
    def _connect_and_send(self, valid_recipients: list, msg: MIMEMultipart) -> int:
        """Open SMTP connection, authenticate, deliver, close. Returns sent count."""
        # Serialize the full message to bytes BEFORE opening the socket.
        # This avoids timeout/disconnect errors when Gmail times out large mid-stream payloads.
        raw_message = msg.as_bytes()

        smtp = smtplib.SMTP(self.smtp_server, self.smtp_port, timeout=60)
        try:
            smtp.ehlo()
            smtp.starttls()
            smtp.ehlo()
            if self.smtp_username and self.smtp_password:
                smtp.login(self.smtp_username, self.smtp_password)
            smtp.sendmail(self.email_from, valid_recipients, raw_message)
        finally:
            try:
                smtp.quit()
            except Exception:
                pass
        return len(valid_recipients)

    # ─────────────────────────────────────────────────────────────────────
    # INTERNAL: recipient validation + deduplication
    # ─────────────────────────────────────────────────────────────────────
    @staticmethod
    def _deduplicate(recipients: list) -> list:
        seen = set()
        valid = []
        for r in recipients:
            addr = r.strip() if r else ""
            if addr and addr not in seen:
                seen.add(addr)
                valid.append(addr)
        return valid

    # ─────────────────────────────────────────────────────────────────────
    # INTERNAL: attach a file to a MIMEMultipart message
    # ─────────────────────────────────────────────────────────────────────
    def _attach_file(self, msg: MIMEMultipart, filepath: str, max_bytes: int = 8_000_000) -> None:
        """
        Attach a file (snapshot or video) to the email message.
        Silently skips if the file does not exist, cannot be read,
        or exceeds max_bytes (default 8 MB) to avoid SMTP timeout on large files.
        """
        if not filepath or not os.path.isfile(filepath):
            logger.warning(f"[EmailService] Attachment skipped — file not found: {filepath}")
            return

        file_size = os.path.getsize(filepath)
        if file_size > max_bytes:
            logger.warning(
                f"[EmailService] Attachment skipped — file too large: "
                f"{os.path.basename(filepath)} ({file_size:,} bytes > {max_bytes:,} byte limit). "
                f"Only the snapshot will be attached."
            )
            return

        filename = os.path.basename(filepath)
        mime_type, _ = mimetypes.guess_type(filepath)
        if mime_type is None:
            mime_type = "application/octet-stream"

        main_type, sub_type = mime_type.split("/", 1)

        try:
            with open(filepath, "rb") as f:
                data = f.read()

            part = MIMEBase(main_type, sub_type)
            part.set_payload(data)
            encoders.encode_base64(part)
            part.add_header("Content-Disposition", "attachment", filename=filename)
            msg.attach(part)
            logger.info(f"[EmailService] Attached file: {filename} ({len(data):,} bytes)")
        except Exception as e:
            logger.warning(f"[EmailService] Failed to attach {filename}: {e}")


    # ─────────────────────────────────────────────────────────────────────
    # PUBLIC: Original plain-text emergency email (used by /api/v1/emergency/send)
    # ─────────────────────────────────────────────────────────────────────
    def send_emergency_email(self, recipients, subject, body_content):
        # Validate recipients and deduplicate (preserving order).
        # Deduplication is important during DEV_MODE where all four slots
        # may hold the same test address — we only want one email delivered.
        valid_recipients = self._deduplicate(recipients)
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
            sent = self._connect_and_send(valid_recipients, msg)
            # Audit log success without exposing password credentials
            logger.info(f"[{time_str}] Emergency email broadcasted successfully to {valid_recipients}")
            return sent
        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"[{time_str}] SMTP Authentication failure: {e}")
            raise RuntimeError("SMTP authentication failed")
        except Exception as e:
            logger.error(f"[{time_str}] SMTP transmission failure: {e}")
            raise e

    # ─────────────────────────────────────────────────────────────────────
    # PUBLIC: Rich HTML alert email with optional snapshot + video attachments
    # Called by AlertDispatcher for automated AI-triggered alerts.
    # ─────────────────────────────────────────────────────────────────────
    def send_alert_email(
        self,
        recipients: list,
        subject: str,
        html_body: str,
        snapshot_path: str = None,
        video_path: str = None,
    ) -> int:
        """
        Send an HTML-formatted alert email with optional file attachments.

        Args:
            recipients    : List of recipient email addresses (raw, will be deduplicated).
            subject       : Email subject line.
            html_body     : Full HTML string for the email body.
            snapshot_path : Absolute path to the alert snapshot JPEG (optional).
            video_path    : Absolute path to the evidence MP4 video (optional).

        Returns:
            Number of recipients the email was delivered to.

        Raises:
            ValueError  : If no valid recipients are provided.
            RuntimeError: If SMTP authentication fails.
        """
        valid_recipients = self._deduplicate(recipients)
        if not valid_recipients:
            raise ValueError("No valid recipients configured for alert email.")

        time_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Build multipart/mixed root → allows both HTML body + binary attachments
        msg = MIMEMultipart("mixed")
        msg["From"] = self.email_from
        msg["To"] = ", ".join(valid_recipients)
        msg["Subject"] = subject
        msg["X-Priority"] = "1"        # High priority flag
        msg["X-MSMail-Priority"] = "High"

        # Nest an alternative container for plain-text + HTML body
        body_alternative = MIMEMultipart("alternative")

        # Plain-text fallback (for clients that don't render HTML)
        plain_text = (
            "🚨 EMERGENCY ALERT — Violence / Distress Detected\n\n"
            "This email requires an HTML-capable client to view properly.\n"
            "Please open this message in a modern email client.\n\n"
            "This is an automated alert from the AI Safety Monitoring System."
        )
        body_alternative.attach(MIMEText(plain_text, "plain", "utf-8"))
        body_alternative.attach(MIMEText(html_body, "html", "utf-8"))
        msg.attach(body_alternative)

        # Attach evidence files
        if snapshot_path:
            self._attach_file(msg, snapshot_path)
        if video_path:
            self._attach_file(msg, video_path)

        try:
            sent = self._connect_and_send(valid_recipients, msg)
            logger.info(
                f"[{time_str}] [AlertEmail] Dispatched to {valid_recipients} | "
                f"snapshot={'YES' if snapshot_path and os.path.isfile(snapshot_path) else 'NO'} | "
                f"video={'YES' if video_path and os.path.isfile(video_path) else 'NO'}"
            )
            return sent
        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"[{time_str}] [AlertEmail] SMTP Authentication failure: {e}")
            raise RuntimeError("SMTP authentication failed")
        except Exception as e:
            logger.error(f"[{time_str}] [AlertEmail] SMTP transmission failure: {e}")
            raise e


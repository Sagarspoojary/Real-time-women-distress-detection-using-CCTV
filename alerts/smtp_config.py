"""
alerts/smtp_config.py
=====================
Central configuration for the SMTP Email Alert System.

HOW TO CONFIGURE
────────────────
Edit the values below OR set environment variables with the same names.
Environment variables always take priority over the defaults here.

To change sender email / password:
  Option A — Set in your shell:
      export ALERT_SMTP_USER="womendistress.ai@gmail.com"
      export ALERT_SMTP_PASSWORD="xxxx xxxx xxxx xxxx"

  Option B — Create a .env file and load it with python-dotenv:
      ALERT_SMTP_USER=womendistress.ai@gmail.com
      ALERT_SMTP_PASSWORD=xxxx xxxx xxxx xxxx

HOW TO GET A GMAIL APP PASSWORD
────────────────────────────────
  1. Enable 2-Step Verification on your Google account
  2. Go to: https://myaccount.google.com/apppasswords
  3. Select app: "Mail" | Device: "Other (custom name)"
  4. Type: "WomenDistressAI"  →  Click Generate
  5. Copy the 16-character password (e.g. "abcd efgh ijkl mnop")
  6. Paste it into ALERT_SMTP_PASSWORD below (or env var)

NEVER commit the actual password to git — .env is in .gitignore.
"""

import os

# ─── SMTP Server ──────────────────────────────────────────────────────────────
SMTP_HOST     = os.environ.get("ALERT_SMTP_HOST",     "smtp.gmail.com")
SMTP_PORT     = int(os.environ.get("ALERT_SMTP_PORT", "587"))
USE_TLS       = True   # Always use STARTTLS with Gmail

# ─── Sender Credentials ───────────────────────────────────────────────────────
# Set these via environment variables or replace the defaults below.
SMTP_USER     = os.environ.get("ALERT_SMTP_USER",     "womendistress.ai@gmail.com")
SMTP_PASSWORD = os.environ.get("ALERT_SMTP_PASSWORD", "ebiy leua xbyz nfoz")

# ─── Fixed Recipients ─────────────────────────────────────────────────────────
# Always sent to BOTH addresses on every alert.
RECIPIENTS = [
    "sagar.23cs125@sode-edu.in",
    "manoj.23cs066@sode-edu.in",
]

# ─── Email Subject ────────────────────────────────────────────────────────────
ALERT_SUBJECT = "🚨 WOMEN DISTRESS ALERT DETECTED"

# ─── Cooldown ─────────────────────────────────────────────────────────────────
# Seconds to wait before sending another alert for the SAME track ID.
# Set to 0 to disable cooldown (not recommended — will spam on every frame).
COOLDOWN_SECONDS = 60

# ─── Distress classes that trigger an alert ───────────────────────────────────
# Only these model2 predictions fire the email when gender == Female.
ALERT_DISTRESS_CLASSES = {"Punching", "Violence", "Fall", "SOS", "punching", "violence", "fall", "sos", "Female Distress"}

# ─── Video clip settings ──────────────────────────────────────────────────────
CLIP_SECONDS_BEFORE = 5     # seconds of footage BEFORE the detection frame
CLIP_SECONDS_AFTER  = 5     # seconds of footage AFTER the detection frame

# ─── Output directory for alert attachments ───────────────────────────────────
ALERTS_OUTPUT_DIR = "outputs/alerts"

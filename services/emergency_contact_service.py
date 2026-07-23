import re
import os
import json

DATA_DIR = "data"
CONTACTS_FILE = os.path.join(DATA_DIR, "emergency_contacts.json")

# ----------------------------------------------------------------
# DEV_MODE: set True during local testing / college demo only.
# When True, duplicate email addresses in all four slots are allowed
# so a single test inbox can receive all alert copies.
# Set to False before production deployment.
# ----------------------------------------------------------------
DEV_MODE = True

# Simple pattern matching for standard email validation
EMAIL_REGEX = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")

class EmergencyContactService:
    def __init__(self):
        os.makedirs(DATA_DIR, exist_ok=True)
        if not os.path.exists(CONTACTS_FILE):
            self._save_to_disk(["", "", "", ""])

    def load_contacts(self):
        try:
            with open(CONTACTS_FILE, "r") as f:
                data = json.load(f)
                contacts = data.get("contacts", [])
                # Ensure array always has exactly 4 elements
                while len(contacts) < 4:
                    contacts.append("")
                return contacts[:4]
        except Exception:
            return ["", "", "", ""]

    def _save_to_disk(self, contacts):
        with open(CONTACTS_FILE, "w") as f:
            json.dump({"contacts": contacts}, f, indent=4)

    def validate_email(self, email):
        if not email:
            return False
        return bool(EMAIL_REGEX.match(email))

    def set_contacts(self, contacts_list):
        # Validate count limit
        if len(contacts_list) > 4:
            raise ValueError("Maximum of four contacts allowed.")
        
        cleaned_contacts = []
        for email in contacts_list:
            if not email or not email.strip():
                raise ValueError("Empty email strings are not allowed.")
            email_stripped = email.strip()
            if not self.validate_email(email_stripped):
                raise ValueError(f"Invalid email format: '{email_stripped}'.")
            cleaned_contacts.append(email_stripped)

        # Check duplicates (skipped in DEV_MODE to allow a single test inbox)
        if not DEV_MODE and len(cleaned_contacts) != len(set(cleaned_contacts)):
            raise ValueError("Duplicate email addresses are not allowed.")

        # Pad remaining slots to preserve length of exactly 4
        while len(cleaned_contacts) < 4:
            cleaned_contacts.append("")

        self._save_to_disk(cleaned_contacts)
        return cleaned_contacts

    def update_contact(self, index, email):
        if index < 0 or index > 3:
            raise IndexError("Invalid contact index. Must be between 0 and 3.")

        if not email or not email.strip():
            raise ValueError("Empty email string is not allowed.")
        email_stripped = email.strip()

        if not self.validate_email(email_stripped):
            raise ValueError(f"Invalid email format: '{email_stripped}'.")

        contacts = self.load_contacts()

        # Check duplicates (skipped in DEV_MODE to allow a single test inbox)
        if not DEV_MODE:
            for idx, existing in enumerate(contacts):
                if idx != index and existing == email_stripped:
                    raise ValueError("Duplicate email address is not allowed.")

        contacts[index] = email_stripped
        self._save_to_disk(contacts)
        return contacts

    def delete_contact(self, index):
        if index < 0 or index > 3:
            raise IndexError("Invalid contact index. Must be between 0 and 3.")

        contacts = self.load_contacts()
        contacts[index] = ""
        self._save_to_disk(contacts)
        return contacts

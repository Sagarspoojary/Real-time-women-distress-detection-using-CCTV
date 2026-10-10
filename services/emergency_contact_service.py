import re
import os
import json
import logging
from typing import List, Dict, Any, Union
from services.phone_notification_service import is_valid_e164, mask_phone_number

logger = logging.getLogger("emergency_contact_service")

DATA_DIR = "data"
CONTACTS_FILE = os.path.join(DATA_DIR, "emergency_contacts.json")

DEV_MODE = True
EMAIL_REGEX = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


class EmergencyContactService:
    """
    Manages emergency contacts with dual email and E.164 phone support.
    Provides backward compatibility for legacy JSON files containing raw email string arrays.
    """

    def __init__(self):
        os.makedirs(DATA_DIR, exist_ok=True)
        if not os.path.exists(CONTACTS_FILE):
            default_contacts = [self._empty_contact(f"Contact {i+1}") for i in range(4)]
            self._save_to_disk(default_contacts)

    def _empty_contact(self, name: str = "Emergency Contact") -> Dict[str, Any]:
        return {
            "name": name,
            "email": "",
            "phone": "",
            "enabled": True
        }

    def _normalize_contact(self, raw_item: Union[str, Dict[str, Any]], index: int) -> Dict[str, Any]:
        """Convert legacy email string or raw dict into a validated contact object."""
        if isinstance(raw_item, str):
            email_val = raw_item.strip()
            return {
                "name": f"Contact {index + 1}",
                "email": email_val,
                "phone": "",
                "enabled": bool(email_val)
            }
        elif isinstance(raw_item, dict):
            email_val = str(raw_item.get("email", "") or "").strip()
            phone_val = str(raw_item.get("phone", "") or "").strip()
            name_val = str(raw_item.get("name", "") or "").strip() or f"Contact {index + 1}"
            enabled_val = bool(raw_item.get("enabled", True))
            return {
                "name": name_val,
                "email": email_val,
                "phone": phone_val,
                "enabled": enabled_val
            }
        return self._empty_contact(f"Contact {index + 1}")

    def load_contacts(self) -> List[Dict[str, Any]]:
        """
        Loads contacts from disk. Automatically converts legacy string arrays to contact objects.
        Always returns exactly 4 contact slots.
        """
        try:
            with open(CONTACTS_FILE, "r") as f:
                data = json.load(f)
                raw_list = data.get("contacts", [])
                
                normalized = []
                for i in range(4):
                    if i < len(raw_list):
                        normalized.append(self._normalize_contact(raw_list[i], i))
                    else:
                        normalized.append(self._empty_contact(f"Contact {i+1}"))
                return normalized[:4]
        except Exception as e:
            logger.warning(f"[EmergencyContactService] Error loading contacts file: {e}")
            return [self._empty_contact(f"Contact {i+1}") for i in range(4)]

    def get_legacy_email_strings(self) -> List[str]:
        """Returns email strings list for backward compatibility with email service."""
        contacts = self.load_contacts()
        return [c["email"] for c in contacts if c.get("enabled") and c.get("email")]

    def get_enabled_phone_numbers(self) -> List[str]:
        """Returns active, validated E.164 phone numbers."""
        contacts = self.load_contacts()
        phones = []
        for c in contacts:
            if c.get("enabled") and c.get("phone"):
                phone = c["phone"].strip()
                if is_valid_e164(phone):
                    phones.append(phone)
                else:
                    logger.warning(f"[EmergencyContactService] Skipping invalid contact phone: {mask_phone_number(phone)}")
        return phones

    def _save_to_disk(self, contacts: List[Dict[str, Any]]):
        with open(CONTACTS_FILE, "w") as f:
            json.dump({"contacts": contacts}, f, indent=4)

    def validate_email(self, email: str) -> bool:
        if not email:
            return False
        return bool(EMAIL_REGEX.match(email.strip()))

    def validate_phone(self, phone: str) -> bool:
        if not phone:
            return True  # Phone is optional
        return is_valid_e164(phone.strip())

    def update_contact(self, index: int, contact_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Updates a specific contact slot (0-3).
        Validates email format, phone format (E.164), and checks for duplicates.
        """
        if index < 0 or index > 3:
            raise IndexError("Invalid contact index. Must be between 0 and 3.")

        email_val = str(contact_data.get("email", "") or "").strip()
        phone_val = str(contact_data.get("phone", "") or "").strip()
        name_val = str(contact_data.get("name", "") or "").strip() or f"Contact {index + 1}"
        enabled_val = bool(contact_data.get("enabled", True))

        if email_val and not self.validate_email(email_val):
            raise ValueError(f"Invalid email format: '{email_val}'.")

        if phone_val and not is_valid_e164(phone_val):
            raise ValueError(f"Invalid E.164 phone format: '{phone_val}'. Expected format: +14155552671 or +919876543210.")

        contacts = self.load_contacts()

        # Check duplicates in non-DEV mode
        if not DEV_MODE:
            for idx, existing in enumerate(contacts):
                if idx != index:
                    if email_val and existing.get("email") == email_val:
                        raise ValueError("Duplicate email address is not allowed.")
                    if phone_val and existing.get("phone") == phone_val:
                        raise ValueError("Duplicate phone number is not allowed.")

        contacts[index] = {
            "name": name_val,
            "email": email_val,
            "phone": phone_val,
            "enabled": enabled_val
        }

        self._save_to_disk(contacts)
        return contacts

    def delete_contact(self, index: int) -> List[Dict[str, Any]]:
        if index < 0 or index > 3:
            raise IndexError("Invalid contact index. Must be between 0 and 3.")

        contacts = self.load_contacts()
        contacts[index] = self._empty_contact(f"Contact {index + 1}")
        self._save_to_disk(contacts)
        return contacts

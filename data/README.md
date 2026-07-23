# Emergency Contacts Data Directory

This directory stores `emergency_contacts.json` at runtime.

The file is excluded from version control because it contains personal email addresses.

## Setup

On first run, the backend will auto-create `emergency_contacts.json` with empty slots.
You can populate contacts via the Settings → Emergency Contacts page in the frontend,
or by hitting the API:

```bash
PUT /api/v1/emergency-contacts
Content-Type: application/json

{
  "contacts": [
    "contact1@example.com",
    "contact2@example.com",
    "contact3@example.com",
    "contact4@example.com"
  ]
}
```

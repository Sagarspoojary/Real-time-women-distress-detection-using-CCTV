"""
download_models.py
==================
Run this script on the deployment server to download AI model weights
from Google Drive before starting the FastAPI backend.

Usage:
    python download_models.py

Setup:
    1. Upload your model .pth files to Google Drive
    2. Right-click each file → Share → "Anyone with the link" → Viewer
    3. Copy the file ID from the share URL:
       https://drive.google.com/file/d/FILE_ID_HERE/view
    4. Paste file IDs into the MODELS dict below
    5. Set the GDRIVE_ENABLED = True flag

Alternative: Set MODELS_SOURCE = "huggingface" and configure HF_REPO below.
"""

import os
import sys

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION — Fill these in before deploying
# ─────────────────────────────────────────────────────────────────────────────

# Set to True once you have your Google Drive file IDs ready
GDRIVE_ENABLED = False

# Google Drive file IDs for each model weight file
# Get ID from: https://drive.google.com/file/d/FILE_ID_HERE/view
GDRIVE_FILE_IDS = {
    "models/model1/videomae_model1_best.pth": "REPLACE_WITH_GDRIVE_FILE_ID_1",
    "models/model2/videomae_model2_best.pth": "REPLACE_WITH_GDRIVE_FILE_ID_2",
    "models/model4/gender_detection_best.pth": "REPLACE_WITH_GDRIVE_FILE_ID_3",
}

# ─── OR ── Hugging Face Hub ───────────────────────────────────────────────────
# Set to True if you uploaded models to Hugging Face Hub instead
HF_ENABLED = False
HF_REPO_ID = "YOUR_HF_USERNAME/women-distress-models"  # e.g. "johndoe/women-distress-models"
HF_FILES = {
    "models/model1/videomae_model1_best.pth": "videomae_model1_best.pth",
    "models/model2/videomae_model2_best.pth": "videomae_model2_best.pth",
    "models/model4/gender_detection_best.pth": "gender_detection_best.pth",
}

# ─────────────────────────────────────────────────────────────────────────────


def download_from_gdrive():
    """Download model weights from Google Drive using gdown."""
    try:
        import gdown
    except ImportError:
        print("[download_models] Installing gdown...")
        os.system(f"{sys.executable} -m pip install gdown -q")
        import gdown

    for local_path, file_id in GDRIVE_FILE_IDS.items():
        if file_id.startswith("REPLACE_WITH"):
            print(f"[download_models] SKIPPED — {local_path} (file ID not set)")
            continue

        os.makedirs(os.path.dirname(local_path), exist_ok=True)

        if os.path.exists(local_path):
            size_mb = os.path.getsize(local_path) / (1024 * 1024)
            print(f"[download_models] ALREADY EXISTS — {local_path} ({size_mb:.1f} MB)")
            continue

        print(f"[download_models] Downloading → {local_path}")
        try:
            url = f"https://drive.google.com/uc?id={file_id}"
            gdown.download(url, local_path, quiet=False)
            size_mb = os.path.getsize(local_path) / (1024 * 1024)
            print(f"[download_models] ✓ Done — {local_path} ({size_mb:.1f} MB)")
        except Exception as e:
            print(f"[download_models] ✗ Failed — {local_path}: {e}")


def download_from_huggingface():
    """Download model weights from Hugging Face Hub."""
    try:
        from huggingface_hub import hf_hub_download
    except ImportError:
        print("[download_models] Installing huggingface_hub...")
        os.system(f"{sys.executable} -m pip install huggingface_hub -q")
        from huggingface_hub import hf_hub_download

    for local_path, hf_filename in HF_FILES.items():
        os.makedirs(os.path.dirname(local_path), exist_ok=True)

        if os.path.exists(local_path):
            size_mb = os.path.getsize(local_path) / (1024 * 1024)
            print(f"[download_models] ALREADY EXISTS — {local_path} ({size_mb:.1f} MB)")
            continue

        print(f"[download_models] Downloading from HF Hub → {local_path}")
        try:
            hf_hub_download(
                repo_id=HF_REPO_ID,
                filename=hf_filename,
                local_dir=os.path.dirname(local_path),
            )
            size_mb = os.path.getsize(local_path) / (1024 * 1024)
            print(f"[download_models] ✓ Done — {local_path} ({size_mb:.1f} MB)")
        except Exception as e:
            print(f"[download_models] ✗ Failed — {local_path}: {e}")


def ensure_directories():
    """Create model subdirectories that must exist even if empty."""
    dirs = [
        "models/model1", "models/model2", "models/model3a",
        "models/model3b", "models/model4", "models/tracker",
        "uploads", "outputs", "temp", "logs", "data",
    ]
    for d in dirs:
        os.makedirs(d, exist_ok=True)


if __name__ == "__main__":
    print("=" * 60)
    print("Women Distress AI — Model Downloader")
    print("=" * 60)

    ensure_directories()

    if GDRIVE_ENABLED:
        print("\n[download_models] Source: Google Drive")
        download_from_gdrive()
    elif HF_ENABLED:
        print("\n[download_models] Source: Hugging Face Hub")
        download_from_huggingface()
    else:
        print("\n[download_models] No download source configured.")
        print("  → Edit download_models.py and set GDRIVE_ENABLED=True")
        print("    OR set HF_ENABLED=True with your file IDs / repo name.")
        print("\n  Models needed:")
        for path in GDRIVE_FILE_IDS:
            exists = "✓ found" if os.path.exists(path) else "✗ MISSING"
            print(f"  {exists}  {path}")

    print("\n[download_models] Done.")

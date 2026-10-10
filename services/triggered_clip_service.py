import os
import logging
import requests
import threading
from typing import Optional

logger = logging.getLogger("triggered_clip_service")

class TriggeredClipService:
    """
    Submits recorded triggered clips to the backend via the dedicated API endpoint.
    Runs completely decoupled from the camera capture thread.
    """
    def __init__(self):
        # Target the existing manual-upload endpoint to reuse the exact analysis pipeline
        port = os.environ.get("PORT", "8000")
        self.api_url = f"http://127.0.0.1:{port}/predict"

    def submit_clip(self, video_path: str):
        """Asynchronously submits the clip to the backend for analysis."""
        threading.Thread(
            target=self._upload_clip_worker,
            args=(video_path,),
            daemon=True
        ).start()

    def _upload_clip_worker(self, video_path: str):
        import uuid
        job_id = str(uuid.uuid4())
        logger.info(f"[TriggeredClipService] [{job_id}] Enqueued upload job for clip: {video_path}")
        
        if not os.path.exists(video_path):
            logger.error(f"[TriggeredClipService] [{job_id}] Video not found: {video_path}")
            return
            
        file_size = os.path.getsize(video_path)
        logger.info(f"[TriggeredClipService] [{job_id}] Started upload. File size: {file_size} bytes. Target URL: {self.api_url}")
        
        try:
            from modules.location_provider import location_provider
            loc = location_provider.get_location_data()
            data = {}
            if loc["latitude"] is not None:
                data["latitude"] = loc["latitude"]
                data["longitude"] = loc["longitude"]
                data["accuracy"] = loc["accuracy"]
                
            with open(video_path, "rb") as f:
                files = {"file": (os.path.basename(video_path), f, "video/mp4")}
                # Timeout is generous to allow for VideoMAE inference processing
                response = requests.post(self.api_url, files=files, data=data, timeout=120.0)
                
            logger.info(f"[TriggeredClipService] [{job_id}] HTTP Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                logger.info(f"[TriggeredClipService] [{job_id}] Analysis complete. Result: {result.get('status')}")
            else:
                logger.error(f"[TriggeredClipService] [{job_id}] Backend error {response.status_code}: {response.text}")
                
        except requests.exceptions.RequestException as e:
            logger.error(f"[TriggeredClipService] [{job_id}] Failed to submit clip for analysis: {e}")
        except Exception as e:
            logger.error(f"[TriggeredClipService] [{job_id}] Unexpected error during clip submission: {e}")

# Global instance
clip_service = TriggeredClipService()

def on_triggered_clip_saved(video_path: str):
    """Callback function injected into TriggeredClipRecorder."""
    clip_service.submit_clip(video_path)

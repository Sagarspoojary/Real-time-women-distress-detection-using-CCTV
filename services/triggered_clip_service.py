import os
import time
import logging
import requests
import threading
from typing import Optional, Dict, Any

logger = logging.getLogger("triggered_clip_service")

class TriggeredClipService:
    """
    Submits recorded triggered clips to the backend via the dedicated API endpoint.
    Runs completely decoupled from the camera capture thread.
    """
    def __init__(self, api_url: Optional[str] = None):
        self._api_url = api_url

    @property
    def api_url(self) -> str:
        """Dynamically resolves backend URL to support containerized, remote, and local environments."""
        if self._api_url is not None:
            return self._api_url

        # Check environment overrides in order of specificity
        configured_url = (
            os.environ.get("TRIGGERED_CLIP_URL")
            or os.environ.get("BACKEND_URL")
            or os.environ.get("API_BASE_URL")
        )
        if configured_url:
            base = configured_url.strip().rstrip("/")
            if base.endswith("/predict"):
                return base
            return f"{base}/predict"

        host = os.environ.get("BACKEND_HOST", "127.0.0.1").strip()
        port = os.environ.get("PORT", "8000").strip()
        return f"http://{host}:{port}/predict"

    @api_url.setter
    def api_url(self, value: Optional[str]):
        self._api_url = value

    def submit_clip(self, video_path: str, source: str = "CAMERA", correlation_id: Optional[str] = None):
        """Asynchronously submits the clip to the backend for analysis."""
        import uuid
        job_id = correlation_id or str(uuid.uuid4())[:8]
        logger.info(f"[TriggeredClipService] [{job_id}] Upload worker scheduled for: '{video_path}' (source: {source})")
        
        threading.Thread(
            target=self._upload_clip_worker,
            args=(video_path, job_id, source),
            daemon=True
        ).start()

    def _upload_clip_worker(self, video_path: str, job_id: Optional[str] = None, source: str = "CAMERA"):
        if job_id is None:
            import uuid
            job_id = str(uuid.uuid4())[:8]
        logger.info(f"[TriggeredClipService] [{job_id}] Upload worker started for '{video_path}' (source: {source})")
        
        if not os.path.exists(video_path):
            logger.error(f"[TriggeredClipService] [{job_id}] Video file not found: '{video_path}'. Upload aborted.")
            return
            
        file_size = os.path.getsize(video_path)
        if file_size == 0:
            logger.error(f"[TriggeredClipService] [{job_id}] Video file is empty (0 bytes): '{video_path}'. Upload aborted.")
            return

        target_url = self.api_url
        logger.info(
            f"[TriggeredClipService] [{job_id}] Preparing upload. "
            f"File: '{os.path.basename(video_path)}' ({file_size} bytes) -> Target: {target_url}"
        )
        
        try:
            from modules.location_provider import location_provider
            loc = location_provider.get_location_data()
            data = {}
            if loc.get("latitude") is not None:
                data["latitude"] = loc["latitude"]
                data["longitude"] = loc["longitude"]
                data["accuracy"] = loc.get("accuracy")

            headers = {
                "X-Correlation-ID": job_id,
                "X-Request-Origin": "triggered_clip",
            }

            t_req_start = time.monotonic()
            with open(video_path, "rb") as f:
                # Multipart form field 'file' matches the /predict endpoint contract
                files = {"file": (os.path.basename(video_path), f, "video/mp4")}
                # Timeout allows for VideoMAE inference processing
                response = requests.post(target_url, files=files, data=data, headers=headers, timeout=120.0)
            
            t_req_elapsed = (time.monotonic() - t_req_start) * 1000.0
            logger.info(f"[TriggeredClipService] [{job_id}] HTTP Response {response.status_code} received in {t_req_elapsed:.1f}ms from {target_url}")
            
            if response.status_code == 200:
                try:
                    result: Dict[str, Any] = response.json()
                    status = result.get("status", "Unknown")
                    m1 = result.get("model1") or {}
                    m2 = result.get("model2") or {}
                    m3 = result.get("model3") or {}
                    incident_id = result.get("incident_id")
                    
                    m1_summary = f"{m1.get('prediction', 'N/A')} ({m1.get('confidence', 0)}%)"
                    m2_summary = f"{m2.get('prediction', 'N/A')} ({m2.get('confidence', 0)}%)"
                    qualifies_str = f"YES (Incident ID: {incident_id})" if incident_id else "NO (Benign or Cooldown Suppressed)"
                    
                    logger.info(
                        f"[TriggeredClipService] [{job_id}] Analysis complete: "
                        f"Overall Status: '{status}' | Model 1 (Violence): {m1_summary} | "
                        f"Model 2 (Distress): {m2_summary} | Persons Detected: {m3.get('people_detected', 0)} | "
                        f"Incident Created: {qualifies_str}"
                    )
                except Exception as json_err:
                    logger.warning(
                        f"[TriggeredClipService] [{job_id}] HTTP 200 received but failed to parse JSON: {json_err} | "
                        f"Response preview: {response.text[:200]}"
                    )
            else:
                logger.error(
                    f"[TriggeredClipService] [{job_id}] Backend returned non-200 status {response.status_code} in {t_req_elapsed:.1f}ms. "
                    f"Response: {response.text[:300]}"
                )
                
        except requests.exceptions.ConnectionError as ce:
            logger.error(
                f"[TriggeredClipService] [{job_id}] Connection failure to backend at {target_url}. "
                f"Ensure backend server is running and reachable: {ce}"
            )
        except requests.exceptions.Timeout as te:
            logger.error(
                f"[TriggeredClipService] [{job_id}] Request timed out after 120s communicating with {target_url}: {te}"
            )
        except requests.exceptions.RequestException as re:
            logger.error(
                f"[TriggeredClipService] [{job_id}] HTTP request exception connecting to {target_url}: {re}"
            )
        except Exception as e:
            logger.error(
                f"[TriggeredClipService] [{job_id}] Unexpected error during clip submission: {e}",
                exc_info=True
            )
        finally:
            logger.info(f"[TriggeredClipService] [{job_id}] Upload worker completed.")

# Global instance
clip_service = TriggeredClipService()

def on_triggered_clip_saved(video_path: str, source: str = "CAMERA", correlation_id: Optional[str] = None):
    """Callback function injected into TriggeredClipRecorder."""
    clip_service.submit_clip(video_path, source=source, correlation_id=correlation_id)



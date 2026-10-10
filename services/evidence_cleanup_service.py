import os
import time
import logging
import threading

logger = logging.getLogger("evidence_cleanup")

class EvidenceCleanupService:
    """
    A service to safely clean up old evidence files (.mp4, .jpg) from the outputs directory.
    Uses EVIDENCE_RETENTION_DAYS (default 30).
    """

    def __init__(self):
        self.retention_days = int(os.environ.get("EVIDENCE_RETENTION_DAYS", "30"))
        self.evidence_dir = os.path.abspath("outputs")
        self.supported_extensions = [".mp4", ".jpg"]

    def _is_safe_path(self, path: str) -> bool:
        """
        Verify that the path is strictly within the evidence_dir.
        Prevents directory traversal attacks.
        """
        try:
            absolute_path = os.path.abspath(path)
            # Ensure it starts with the absolute path of the evidence directory
            if not absolute_path.startswith(self.evidence_dir):
                return False
            return True
        except Exception:
            return False

    def run_cleanup(self):
        """
        Execute the cleanup logic. Safe to run in a background thread.
        """
        logger.info(f"[EvidenceCleanup] Evidence cleanup started")
        logger.info(f"[EvidenceCleanup] Retention period: {self.retention_days} days")

        if not os.path.exists(self.evidence_dir):
            logger.info(f"[EvidenceCleanup] Outputs directory does not exist. Skipping.")
            return

        now = time.time()
        retention_seconds = self.retention_days * 86400

        files_scanned = 0
        files_deleted = 0
        files_skipped = 0
        files_failed = 0

        # Only scan files at the top level of outputs directory
        try:
            files = os.listdir(self.evidence_dir)
        except Exception as e:
            logger.error(f"[EvidenceCleanup] Failed to list outputs directory: {e}")
            return

        for filename in files:
            file_path = os.path.join(self.evidence_dir, filename)
            
            # Skip directories
            if not os.path.isfile(file_path):
                continue
            
            # Ensure it has a supported extension
            ext = os.path.splitext(filename)[1].lower()
            if ext not in self.supported_extensions:
                continue

            files_scanned += 1

            # Safety check
            if not self._is_safe_path(file_path):
                logger.warning(f"[EvidenceCleanup] Path traversal prevented: {file_path}")
                files_skipped += 1
                continue

            try:
                # Get modification time
                mtime = os.path.getmtime(file_path)
                file_age = now - mtime

                if file_age > retention_seconds:
                    # File is older than retention period
                    os.remove(file_path)
                    logger.debug(f"[EvidenceCleanup] Deleted expired evidence: {filename}")
                    files_deleted += 1
                else:
                    # File is recent
                    files_skipped += 1
            except FileNotFoundError:
                # File disappeared before we could delete it
                files_failed += 1
            except PermissionError as e:
                logger.error(f"[EvidenceCleanup] Permission denied deleting {filename}: {e}")
                files_failed += 1
            except Exception as e:
                logger.error(f"[EvidenceCleanup] Error processing {filename}: {e}")
                files_failed += 1

        logger.info(f"[EvidenceCleanup] Files scanned: {files_scanned}")
        logger.info(f"[EvidenceCleanup] Files deleted: {files_deleted}")
        logger.info(f"[EvidenceCleanup] Files skipped: {files_skipped}")
        logger.info(f"[EvidenceCleanup] Files failed: {files_failed}")

def start_cleanup_task():
    """
    Start the cleanup process in a background thread.
    """
    service = EvidenceCleanupService()
    thread = threading.Thread(target=service.run_cleanup, daemon=True, name="EvidenceCleanupThread")
    thread.start()

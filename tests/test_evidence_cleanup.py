import os
import time
import unittest
import tempfile
import shutil
from unittest.mock import patch

from services.evidence_cleanup_service import EvidenceCleanupService

class TestEvidenceCleanupService(unittest.TestCase):
    def setUp(self):
        # Create a temporary directory for testing evidence cleanup
        self.test_dir = tempfile.mkdtemp()
        self.service = EvidenceCleanupService()
        self.service.evidence_dir = self.test_dir
        self.service.retention_days = 30 # Default 30 days

    def tearDown(self):
        # Remove the temporary directory
        shutil.rmtree(self.test_dir)

    def test_old_evidence_is_deleted(self):
        # Create an old mp4 file
        old_file = os.path.join(self.test_dir, "old_incident.mp4")
        with open(old_file, "w") as f:
            f.write("old data")
        
        # Modify the timestamp to be 31 days old
        thirty_one_days_ago = time.time() - (31 * 86400)
        os.utime(old_file, (thirty_one_days_ago, thirty_one_days_ago))

        self.service.run_cleanup()

        # The file should be deleted
        self.assertFalse(os.path.exists(old_file))

    def test_recent_evidence_is_preserved(self):
        # Create a new mp4 file
        new_file = os.path.join(self.test_dir, "new_incident.mp4")
        with open(new_file, "w") as f:
            f.write("new data")
        
        self.service.run_cleanup()

        # The file should be preserved
        self.assertTrue(os.path.exists(new_file))

    def test_different_supported_types_handled(self):
        # Create an old jpg file
        old_jpg = os.path.join(self.test_dir, "old_snapshot.jpg")
        with open(old_jpg, "w") as f:
            f.write("old data")
        thirty_one_days_ago = time.time() - (31 * 86400)
        os.utime(old_jpg, (thirty_one_days_ago, thirty_one_days_ago))

        # Create an old txt file (unsupported)
        old_txt = os.path.join(self.test_dir, "old_log.txt")
        with open(old_txt, "w") as f:
            f.write("old log")
        os.utime(old_txt, (thirty_one_days_ago, thirty_one_days_ago))

        self.service.run_cleanup()

        # JPG should be deleted, TXT should be preserved
        self.assertFalse(os.path.exists(old_jpg))
        self.assertTrue(os.path.exists(old_txt))

    def test_path_traversal_is_rejected(self):
        self.assertFalse(self.service._is_safe_path("../some/path.mp4"))
        self.assertFalse(self.service._is_safe_path("/etc/passwd"))

        safe_path = os.path.join(self.test_dir, "incident.mp4")
        self.assertTrue(self.service._is_safe_path(safe_path))

    @patch('os.remove')
    def test_permission_failure_does_not_crash(self, mock_remove):
        mock_remove.side_effect = PermissionError("Access Denied")

        old_file = os.path.join(self.test_dir, "old_incident.mp4")
        with open(old_file, "w") as f:
            f.write("old data")
        thirty_one_days_ago = time.time() - (31 * 86400)
        os.utime(old_file, (thirty_one_days_ago, thirty_one_days_ago))

        # This should not raise an exception
        self.service.run_cleanup()
        
        # It should have attempted to remove it
        mock_remove.assert_called_once_with(old_file)

if __name__ == '__main__':
    unittest.main()

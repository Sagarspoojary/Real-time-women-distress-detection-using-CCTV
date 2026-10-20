import os
import json
import unittest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app import app
from database.database import SessionLocal, Base, engine
from database.models import CameraSetting
from services.camera_connection_service import (
    CameraConnectionService,
    CAMERA_SETTINGS_FILE,
    DEFAULT_CAMERA_ID
)
from modules.ip_webcam_processor import IPWebcamStreamProcessor

class TestIPWebcamIntegration(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        cls._backup_rows = []
        try:
            for r in db.query(CameraSetting).all():
                cls._backup_rows.append({
                    "camera_id": r.camera_id,
                    "name": r.name,
                    "host": r.host,
                    "port": r.port,
                    "path": r.path,
                    "username": r.username,
                    "password": r.password,
                    "auto_reconnect": r.auto_reconnect,
                    "updated_by": r.updated_by
                })
        finally:
            db.close()

        cls._backup_json = None
        if os.path.exists(CAMERA_SETTINGS_FILE):
            try:
                with open(CAMERA_SETTINGS_FILE, "r") as f:
                    cls._backup_json = f.read()
            except Exception:
                pass

    @classmethod
    def tearDownClass(cls):
        db = SessionLocal()
        try:
            db.query(CameraSetting).delete()
            for r in cls._backup_rows:
                db.add(CameraSetting(**r))
            db.commit()
        finally:
            db.close()

        if cls._backup_json is not None:
            try:
                with open(CAMERA_SETTINGS_FILE, "w") as f:
                    f.write(cls._backup_json)
            except Exception:
                pass

    def setUp(self):
        self.client = TestClient(app)
        db = SessionLocal()
        try:
            db.query(CameraSetting).delete()
            db.commit()
        finally:
            db.close()
        if os.path.exists(CAMERA_SETTINGS_FILE):
            try:
                os.remove(CAMERA_SETTINGS_FILE)
            except Exception:
                pass

    def tearDown(self):
        db = SessionLocal()
        try:
            db.query(CameraSetting).delete()
            db.commit()
        finally:
            db.close()
        if os.path.exists(CAMERA_SETTINGS_FILE):
            try:
                os.remove(CAMERA_SETTINGS_FILE)
            except Exception:
                pass

    # 1. Host / IP Validation & SSRF Prevention
    def test_valid_and_invalid_hostnames_and_ips(self):
        service = CameraConnectionService()

        # Valid local RFC 1918 IPs and localhost
        self.assertEqual(service.validate_host("192.168.1.100"), "192.168.1.100")
        self.assertEqual(service.validate_host("10.0.0.5"), "10.0.0.5")
        self.assertEqual(service.validate_host("172.16.0.25"), "172.16.0.25")
        self.assertEqual(service.validate_host("127.0.0.1"), "127.0.0.1")
        self.assertEqual(service.validate_host("android.local"), "android.local")
        self.assertEqual(service.validate_host("http://192.168.1.55:8080"), "192.168.1.55")

        # Invalid / Empty / Malformed
        with self.assertRaises(ValueError):
            service.validate_host("")
        with self.assertRaises(ValueError):
            service.validate_host("   ")
        with self.assertRaises(ValueError):
            service.validate_host("999.999.999.999")
        with self.assertRaises(ValueError):
            service.validate_host("invalid_host_with_special!chars")

        # SSRF Protection: Cloud metadata link-local
        with self.assertRaises(ValueError):
            service.validate_host("169.254.169.254")
        with self.assertRaises(ValueError):
            service.validate_host("metadata.google.internal")

        # SSRF Protection: Public WAN IP rejected for local Wi-Fi only constraint
        with self.assertRaises(ValueError):
            service.validate_host("8.8.8.8")
        with self.assertRaises(ValueError):
            service.validate_host("1.1.1.1")

    # 2. Port Validation
    def test_valid_and_invalid_ports(self):
        service = CameraConnectionService()
        self.assertEqual(service.validate_port(8080), 8080)
        self.assertEqual(service.validate_port("8080"), 8080)
        self.assertEqual(service.validate_port(80), 80)
        self.assertEqual(service.validate_port(None), 8080)
        self.assertEqual(service.validate_port(""), 8080)

        with self.assertRaises(ValueError):
            service.validate_port(0)
        with self.assertRaises(ValueError):
            service.validate_port(70000)
        with self.assertRaises(ValueError):
            service.validate_port("invalid_port")

    # 3. Path Validation
    def test_stream_path_validation(self):
        service = CameraConnectionService()
        self.assertEqual(service.validate_path("/videofeed"), "/videofeed")
        self.assertEqual(service.validate_path("videofeed"), "/videofeed")
        self.assertEqual(service.validate_path("/video"), "/video")
        self.assertEqual(service.validate_path(None), "/videofeed")

        with self.assertRaises(ValueError):
            service.validate_path("../etc/passwd")
        with self.assertRaises(ValueError):
            service.validate_path("/path with spaces")

    def test_normalize_stream_url(self):
        service = CameraConnectionService()
        # Missing path auto-appends /videofeed
        self.assertEqual(
            service.normalize_stream_url("https://10.61.181.231:8080"),
            "https://10.61.181.231:8080/videofeed"
        )
        self.assertEqual(
            service.normalize_stream_url("http://192.168.1.50:8080/"),
            "http://192.168.1.50:8080/videofeed"
        )
        self.assertEqual(
            service.normalize_stream_url("192.168.1.50:8080"),
            "http://192.168.1.50:8080/videofeed"
        )
        # Custom paths preserved
        self.assertEqual(
            service.normalize_stream_url("http://192.168.1.50:8080/video"),
            "http://192.168.1.50:8080/video"
        )
        # SSRF forbidden
        with self.assertRaises(ValueError):
            service.normalize_stream_url("http://169.254.169.254:8080")

    # 4. Centralized Persistent Configuration & URL Masking
    def test_save_and_reload_configuration_persistence(self):
        service = CameraConnectionService()

        # Initial unconfigured state
        initial = service.get_public_configuration()
        self.assertFalse(initial["is_configured"])
        self.assertIsNone(initial["host"])
        self.assertIsNone(initial["active_url_masked"])

        # Save new configuration
        saved = service.save_configuration({
            "name": "Samsung S22 Camera",
            "host": "192.168.1.150",
            "port": 8080,
            "path": "/videofeed",
            "username": "camera_user",
            "password": "super_secret_password"
        })

        self.assertTrue(saved["is_configured"])
        self.assertEqual(saved["host"], "192.168.1.150")
        self.assertEqual(saved["port"], 8080)
        self.assertTrue(saved["has_password"])
        self.assertNotIn("super_secret_password", str(saved))
        self.assertIn("****:****@192.168.1.150:8080/videofeed", saved["active_url_masked"])

        # Verify DB directly
        db = SessionLocal()
        try:
            row = db.query(CameraSetting).filter(CameraSetting.camera_id == DEFAULT_CAMERA_ID).first()
            self.assertIsNotNone(row)
            self.assertEqual(row.host, "192.168.1.150")
            self.assertEqual(row.name, "Samsung S22 Camera")
            self.assertEqual(row.password, "super_secret_password")
        finally:
            db.close()

        # Verify JSON backup file
        self.assertTrue(os.path.exists(CAMERA_SETTINGS_FILE))
        with open(CAMERA_SETTINGS_FILE, "r") as f:
            data = json.load(f)
            self.assertIn(DEFAULT_CAMERA_ID, data)
            self.assertEqual(data[DEFAULT_CAMERA_ID]["host"], "192.168.1.150")

        # Verify fresh service re-instantiation reads the persisted configuration
        fresh_service = CameraConnectionService()
        reloaded = fresh_service.get_public_configuration()
        self.assertTrue(reloaded["is_configured"])
        self.assertEqual(reloaded["host"], "192.168.1.150")
        self.assertEqual(reloaded["source"], "database")

    # 5. REST API: GET / PUT Camera Configuration
    def test_api_get_and_put_config(self):
        # 1. GET unconfigured initially
        resp = self.client.get("/api/v1/ipwebcam/config")
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(resp.json()["config"]["is_configured"])

        # 2. PUT valid configuration with operator role
        put_resp = self.client.put(
            "/api/v1/ipwebcam/config",
            json={
                "name": "Hallway Android Camera",
                "host": "192.168.0.45",
                "port": 8080,
                "path": "/videofeed",
                "username": "admin",
                "password": "mypassword"
            },
            headers={"X-User-Role": "operator"}
        )
        self.assertEqual(put_resp.status_code, 200)
        config = put_resp.json()["config"]
        self.assertTrue(config["is_configured"])
        self.assertEqual(config["host"], "192.168.0.45")
        self.assertNotIn("mypassword", str(put_resp.json()))

        # 3. PUT with forbidden cloud metadata rejected
        err_resp = self.client.put(
            "/api/v1/ipwebcam/config",
            json={"host": "169.254.169.254"},
            headers={"X-User-Role": "operator"}
        )
        self.assertEqual(err_resp.status_code, 400)

        # 4. Role authorization check: viewer rejected
        role_resp = self.client.put(
            "/api/v1/ipwebcam/config",
            json={"host": "192.168.0.45"},
            headers={"X-User-Role": "viewer"}
        )
        self.assertEqual(role_resp.status_code, 403)

    # 6. Pre-flight Reachability Test Endpoint
    @patch.object(CameraConnectionService, "check_tcp_port", return_value=True)
    @patch("services.camera_connection_service.requests.get")
    def test_preflight_connection_test(self, mock_requests_get, mock_tcp_probe):
        # Mock successful HTTP 200 response
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.headers = {"Content-Type": "multipart/x-mixed-replace; boundary=frame"}
        mock_requests_get.return_value = mock_resp

        test_resp = self.client.post(
            "/api/v1/ipwebcam/test",
            json={"host": "192.168.1.100", "port": 8080, "path": "/videofeed"}
        )
        self.assertEqual(test_resp.status_code, 200)
        data = test_resp.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["status_code"], 200)
        self.assertIn("Camera reachable", data["message"])

        # Test 401 Unauthorized handling
        mock_resp.status_code = 401
        test_401 = self.client.post(
            "/api/v1/ipwebcam/test",
            json={"host": "192.168.1.100", "port": 8080, "path": "/videofeed"}
        )
        self.assertEqual(test_401.status_code, 200)
        self.assertFalse(test_401.json()["success"])
        self.assertIn("Authentication required", test_401.json()["message"])

    # 7. Dynamic Reconnection Without Reloading Models
    @patch("modules.ip_webcam_processor.cv2.VideoCapture")
    @patch("modules.ip_webcam_processor.WomenDistressPipeline")
    def test_dynamic_reconnect_without_model_reinstantiation(self, mock_pipeline_cls, mock_videocapture_cls):
        mock_pipeline_inst = MagicMock()
        mock_pipeline_cls.return_value = mock_pipeline_inst

        mock_cap = MagicMock()
        mock_cap.isOpened.return_value = True
        mock_cap.read.return_value = (False, None) # stream ends immediately to avoid blocking
        mock_videocapture_cls.return_value = mock_cap

        # Configure camera
        service = CameraConnectionService()
        service.save_configuration({"host": "192.168.1.100", "port": 8080, "path": "/videofeed"})

        # Start camera
        start_resp = self.client.post("/api/v1/ipwebcam/connect")
        self.assertEqual(start_resp.status_code, 200)

        # Pipeline class instantiated once
        self.assertEqual(mock_pipeline_cls.call_count, 1)

        # Now update IP address via PUT /config to 192.168.1.200
        update_resp = self.client.put(
            "/api/v1/ipwebcam/config",
            json={"host": "192.168.1.200", "port": 8080, "path": "/videofeed"},
            headers={"X-User-Role": "operator"}
        )
        self.assertEqual(update_resp.status_code, 200)
        self.assertTrue(update_resp.json()["reconnected"])

        # Verify pipeline class was NEVER re-instantiated (model weights preserved)
        self.assertEqual(mock_pipeline_cls.call_count, 1)

        # Disconnect
        stop_resp = self.client.post("/api/v1/ipwebcam/disconnect")
        self.assertEqual(stop_resp.status_code, 200)

    # 8. Unconfigured State Handling
    def test_unconfigured_start_returns_400(self):
        # Database has no IP configured
        resp = self.client.post("/api/v1/ipwebcam/connect")
        self.assertEqual(resp.status_code, 400)
        self.assertIn("Camera is not configured", resp.json()["detail"])

if __name__ == "__main__":
    unittest.main()

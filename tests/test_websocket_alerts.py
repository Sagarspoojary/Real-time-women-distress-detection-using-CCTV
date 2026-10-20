import os
import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient

from app import app
from routes import ws as ws_module
from services.alert_dispatcher import AlertDispatcher

class TestWebSocketAlerts(unittest.TestCase):
    def setUp(self):
        while not ws_module.ws_event_queue.empty():
            try:
                ws_module.ws_event_queue.get_nowait()
            except Exception:
                break
    def test_websocket_handshake_and_event_receipt(self):
        with TestClient(app) as client:
            # 1. Connect over WebSocket
            with client.websocket_connect("/api/v1/ws/alerts") as ws:
                # 2. Check client is registered
                self.assertIn(ws.scope["endpoint"], [c.scope["endpoint"] for c in ws_module.clients if hasattr(c, "scope")])

                # 3. Simulate safe incident persistence
                with patch.object(AlertDispatcher, "_dispatch_job_async", return_value=None):
                    dispatcher = AlertDispatcher()
                    dummy_result = {
                        "model1": {"prediction": "Assault", "confidence": 95.0},
                        "model2": {"prediction": "Normal", "confidence": 0.0},
                        "persons": []
                    }
                    incident_id = dispatcher.maybe_dispatch(
                        pipeline_result=dummy_result,
                        video_path="outputs/test_ws_unit.mp4"
                    )
                    self.assertIsNotNone(incident_id)

                # 4. Receive event from broadcast
                event = ws.receive_json()
                self.assertEqual(event.get("type"), "NEW_INCIDENT")
                self.assertEqual(event.get("incident_id"), incident_id)

    def test_client_clean_disconnect(self):
        with TestClient(app) as client:
            initial_count = len(ws_module.clients)
            with client.websocket_connect("/api/v1/ws/alerts"):
                self.assertEqual(len(ws_module.clients), initial_count + 1)
            self.assertEqual(len(ws_module.clients), initial_count)

if __name__ == "__main__":
    unittest.main()

import sys
import os

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

# Force offline mode for models
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ["ENABLE_EMAIL_ALERTS"] = "false"
os.environ["SMS_ENABLED"] = "false"
os.environ["ENABLE_SMS_ALERTS"] = "false"
os.environ["ENABLE_CALL_ALERTS"] = "false"

import time
import socket
import asyncio
import threading
import json
from unittest.mock import patch, MagicMock

import uvicorn
import websockets
from app import app
from routes import ws as ws_module
from services.alert_dispatcher import AlertDispatcher

def find_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]

def wait_for_port(port, timeout=30.0):
    start = time.time()
    while time.time() - start < timeout:
        try:
            with socket.create_connection(('127.0.0.1', port), timeout=0.5):
                return True
        except (ConnectionRefusedError, OSError):
            time.sleep(0.2)
    return False

async def run_websocket_verification(port: int):
    uri = f"ws://127.0.0.1:{port}/api/v1/ws/alerts"
    print(f"\n[WS TEST] Connecting to {uri}...")
    
    t_handshake_start = time.perf_counter()
    async with websockets.connect(uri) as websocket:
        t_handshake_elapsed = (time.perf_counter() - t_handshake_start) * 1000.0
        print(f"[WS TEST] 1. Handshake SUCCESS in {t_handshake_elapsed:.2f}ms! Protocol upgrade verified.")
        
        # 2. Verify server registered client
        time.sleep(0.2)
        print(f"[WS TEST] 2. Active server clients registered: {len(ws_module.clients)}")
        assert len(ws_module.clients) >= 1, "Server failed to register connected WebSocket client"

        # 3. Trigger safe test incident persistence via AlertDispatcher with mocked notifications
        print("[WS TEST] 3. Enqueuing safe test incident via AlertDispatcher...")
        with patch.object(AlertDispatcher, "_dispatch_job_async", return_value=None):
            dispatcher = AlertDispatcher()
            dummy_result = {
                "model1": {"prediction": "Assault", "confidence": 98.0},
                "model2": {"prediction": "Normal", "confidence": 0.0},
                "persons": []
            }
            incident_id = dispatcher.maybe_dispatch(
                pipeline_result=dummy_result,
                video_path="outputs/test_ws.mp4"
            )
            print(f"[WS TEST] Safe test incident persisted to DB: ID={incident_id}")
            assert incident_id is not None, "Failed to create test incident"

        # 4. Await event receipt on WebSocket client
        print("[WS TEST] 4. Waiting for real incident event over WebSocket...")
        t_recv_start = time.perf_counter()
        raw_msg = await asyncio.wait_for(websocket.recv(), timeout=10.0)
        t_recv_elapsed = (time.perf_counter() - t_recv_start) * 1000.0
        
        event = json.loads(raw_msg)
        print(f"[WS TEST] Event received in {t_recv_elapsed:.2f}ms: {event}")
        assert event.get("type") == "NEW_INCIDENT", f"Expected 'NEW_INCIDENT', got {event.get('type')}"
        assert event.get("incident_id") == incident_id, f"Expected {incident_id}, got {event.get('incident_id')}"
        print("[WS TEST] Event verification PASSED!")

        # 5. Clean disconnect
        print("[WS TEST] 5. Disconnecting client cleanly...")
        await websocket.close()
        print("[WS TEST] WebSocket client closed.")

    await asyncio.sleep(0.5)
    print(f"[WS TEST] Active server clients after disconnect: {len(ws_module.clients)}")
    print("[WS TEST] ALL WEBSOCKET TESTS PASSED SUCCESSFULLY!\n")

def main():
    port = find_free_port()
    config = uvicorn.Config(app=app, host="127.0.0.1", port=port, log_level="warning")
    server = uvicorn.Server(config)
    
    server_thread = threading.Thread(target=server.run, daemon=True)
    server_thread.start()
    
    print(f"[WS TEST] Starting test server on port {port}...")
    if not wait_for_port(port, timeout=30.0):
        print("[WS TEST] Server failed to start in 30s")
        sys.exit(1)
        
    print(f"[WS TEST] Server is listening on port {port}. Running verification...")
    try:
        asyncio.run(run_websocket_verification(port))
    finally:
        server.should_exit = True
        server_thread.join(timeout=3)

if __name__ == "__main__":
    main()

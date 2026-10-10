import asyncio
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Set
import queue

logger = logging.getLogger("ws_alerts")
router = APIRouter()

clients: Set[WebSocket] = set()
ws_event_queue = queue.Queue()

async def broadcast_loop():
    logger.info("[WebSocket] Broadcast loop started")
    while True:
        if not ws_event_queue.empty():
            msg = ws_event_queue.get()
            disconnected = set()
            for client in list(clients):
                try:
                    await client.send_json(msg)
                except Exception as e:
                    logger.debug(f"[WebSocket] Disconnected client: {e}")
                    disconnected.add(client)
            
            for d in disconnected:
                if d in clients:
                    clients.remove(d)
        await asyncio.sleep(0.5)

@router.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    await websocket.accept()
    clients.add(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        if websocket in clients:
            clients.remove(websocket)
    except Exception as e:
        logger.error(f"[WebSocket] Error: {e}")
        if websocket in clients:
            clients.remove(websocket)

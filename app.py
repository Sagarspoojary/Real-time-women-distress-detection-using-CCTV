import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# ── Load .env FIRST — before any service or module reads os.environ ──────────
try:
    from dotenv import load_dotenv
    load_dotenv(override=True)   # override=True forces .env values even if already in shell
except ImportError:
    pass  # python-dotenv not installed; env vars must be set in the shell environment

from routes.predict import router
from routes.emergency_contacts import router as emergency_contacts_router
from routes.emergency import router as emergency_router
from routes.location import router as location_router
from routes.cameras import router as camera_router
from routes.webcam import router as webcam_router
from routes.ip_webcam import router as ip_webcam_router
from routes.history import router as history_router
from routes.ws import router as ws_router
from routes.ws import broadcast_loop
from services.evidence_cleanup_service import start_cleanup_task
import asyncio

app = FastAPI(title="Women Distress AI")

@app.on_event("startup")
async def startup_event():
    # Setup database tables
    import logging
    from database.database import engine, Base
    import database.models  # Ensure models are loaded
    try:
        Base.metadata.create_all(bind=engine)
        logging.getLogger("uvicorn").info("[DB] SQLite database mounted successfully.")
    except Exception as e:
        logging.getLogger("uvicorn").error(f"[DB] Error creating database tables: {e}")
        
    # Start evidence cleanup in background
    start_cleanup_task()
    
    # Start websocket broadcast loop
    asyncio.create_task(broadcast_loop())

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Frontend dist path ───────────────────────────────────────────────────────
FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "frontend", "dist")
FRONTEND_BUILT = os.path.exists(FRONTEND_DIST)

# ─── API Health check ─────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "online", "message": "Women Distress AI Backend Service is running."}

# ─── Outputs (processed videos) ──────────────────────────────────────────────
app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")

# ─── API Routers ──────────────────────────────────────────────────────────────
app.include_router(router)
app.include_router(emergency_contacts_router, prefix="/api/v1")
app.include_router(emergency_router, prefix="/api/v1")
app.include_router(location_router, prefix="/api/v1")
app.include_router(camera_router, prefix="/api/v1")
app.include_router(webcam_router, prefix="/api/v1")
app.include_router(history_router, prefix="/api/v1")
app.include_router(ws_router, prefix="/api/v1")
app.include_router(ip_webcam_router, prefix="/api/v1")

# ─── Serve built React frontend (SPA) ────────────────────────────────────────
# When frontend/dist exists (after: cd frontend && npm run build),
# FastAPI serves the full app — one ngrok tunnel serves everything.
# ─────────────────────────────────────────────────────────────────────────────
if FRONTEND_BUILT:
    # Serve Vite asset bundles (JS, CSS, images)
    _assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if os.path.exists(_assets_dir):
        app.mount("/assets", StaticFiles(directory=_assets_dir), name="spa-assets")

    # Serve favicon and other root-level static files
    @app.get("/favicon.svg")
    async def favicon():
        return FileResponse(os.path.join(FRONTEND_DIST, "favicon.svg"))

    @app.get("/icons.svg")
    async def icons():
        return FileResponse(os.path.join(FRONTEND_DIST, "icons.svg"))

    # Root → React app
    @app.get("/")
    async def serve_root():
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))

    # Catch-all → React Router handles all client-side routes
    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))

else:
    # No frontend build found — return JSON status
    @app.get("/")
    async def root():
        return {
            "status": "online",
            "message": "Women Distress AI Backend Service is running.",
            "note": "Frontend not built. Run: cd frontend && npm run build"
        }

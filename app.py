import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from routes.predict import router
from routes.emergency_contacts import router as emergency_contacts_router
from routes.emergency import router as emergency_router
from routes.location import router as location_router

app = FastAPI(title="Women Distress AI")

# ─── CORS ─────────────────────────────────────────────────────────────────────
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
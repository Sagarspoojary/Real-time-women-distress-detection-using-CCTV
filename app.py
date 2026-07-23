import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routes.predict import router
from routes.emergency_contacts import router as emergency_contacts_router
from routes.emergency import router as emergency_router

app = FastAPI(title="Women Distress AI")

# ─── CORS ─────────────────────────────────────────────────────────────────────
# Default origins for local development.
# For production, set ALLOWED_ORIGINS environment variable as a
# comma-separated list of allowed frontend URLs:
#   ALLOWED_ORIGINS=https://your-app.vercel.app,https://your-custom-domain.com
# ──────────────────────────────────────────────────────────────────────────────
_default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
_env_origins = os.getenv("ALLOWED_ORIGINS", "")
_extra_origins = [o.strip() for o in _env_origins.split(",") if o.strip()]
ALLOWED_ORIGINS = _default_origins + _extra_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root health-check endpoint to verify backend connectivity
@app.get("/")
async def root():
    return {"status": "online", "message": "Women Distress AI Backend Service is running."}

# Mount outputs directory statically
app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")

app.include_router(router)
app.include_router(emergency_contacts_router, prefix="/api/v1")
app.include_router(emergency_router, prefix="/api/v1")
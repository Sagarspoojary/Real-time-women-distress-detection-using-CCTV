# Deployment Guide — Women Distress AI

## The Honest Reality First

This project has **heavy AI models** that make deployment different from a typical web app:

| Component | Size | RAM needed |
|---|---|---|
| VideoMAE Model 1 | 329 MB | ~1.5 GB |
| VideoMAE Model 2 | 329 MB | ~1.5 GB |
| EfficientNetV2-S (Gender) | 78 MB | ~300 MB |
| YOLO11n | 5.6 MB + 5.9 MB | ~200 MB |
| **Total** | **~747 MB** | **~3.5–4 GB RAM** |

### What works where

| Platform | Frontend (React) | Backend (FastAPI + AI) |
|---|---|---|
| **Vercel** | ✅ PERFECT — free | ❌ No — serverless only, 50MB limit |
| **Netlify** | ✅ PERFECT — free | ❌ No — serverless only |
| **Render** | ✅ Can host | ✅ YES — needs paid plan (Standard $25/mo or higher) |
| **Railway** | ✅ Can host | ✅ YES — $5/mo, 8GB RAM available |
| **Hugging Face Spaces** | ❌ Not ideal | ✅ BEST free ML option — built for AI |
| **Fly.io** | ✅ | ✅ YES — free tier 256MB (not enough), $1.94/mo for 1GB |

---

## Recommended Architecture for Your Project

```
[ Users ]
    │
    ▼
[ Vercel ] ─── React Frontend (FREE)
    │
    │ API calls to VITE_API_URL
    ▼
[ Render / Railway ] ─── FastAPI Backend + All AI Models (PAID)
```

**Best combination for a college demo:**
- **Frontend → Vercel** (completely free, blazing fast CDN)
- **Backend → Render Standard** ($25/mo) OR **Railway** ($5/mo hobby plan)

---

## PART 1 — Deploy Frontend to Vercel (FREE)

### Step 1 — Set API URL environment variable

In `frontend/src/services/api.ts` your code already reads:
```
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
```
This is perfect — you just need to set `VITE_API_URL` in Vercel's dashboard.

### Step 2 — Push frontend to GitHub (already done ✅)

Your frontend code is already in the repo.

### Step 3 — Deploy on Vercel

1. Go to https://vercel.com → Sign up with GitHub
2. Click **"Add New Project"**
3. Import your repo: `Sagarspoojary/Real-time-women-distress-detection-using-CCTV`
4. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`  (auto-detected)
   - **Output Directory:** `dist`  (auto-detected)
5. Add **Environment Variables:**
   ```
   VITE_API_URL = https://your-render-app.onrender.com
   ```
   (You'll get this URL after deploying backend — fill it in after Step PART 2)
6. Click **Deploy**

Vercel auto-deploys on every `git push` to main branch.

---

## PART 2A — Deploy Backend to Render (Standard Plan)

### Why Render Standard ($25/mo)?
- 2 GB RAM (minimum needed for VideoMAE + Gender model together)
- Persistent disk available (needed for model weights)
- Supports Python + Docker
- Free tier (512MB RAM) will crash when loading VideoMAE

### Step 1 — Create a render.yaml in your project root

```yaml
services:
  - type: web
    name: women-distress-ai-backend
    env: python
    region: oregon
    plan: standard
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn app:app --host 0.0.0.0 --port $PORT
    disk:
      name: models-disk
      mountPath: /opt/render/project/src/models
      sizeGB: 5
    envVars:
      - key: SMTP_HOST
        sync: false
      - key: SMTP_PORT
        sync: false
      - key: SMTP_USER
        sync: false
      - key: SMTP_PASSWORD
        sync: false
      - key: EMAIL_FROM
        sync: false
```

### Step 2 — Handle model weights (CRITICAL)

Models are NOT in GitHub. You need to upload them to Render's persistent disk.

**Option A — Upload via Render Shell (easiest):**
1. Deploy the app first (it will start without models — that's OK)
2. Go to Render dashboard → your service → **Shell** tab
3. Run:
   ```bash
   ls /opt/render/project/src/models/
   ```
4. Use `curl` to download models from Google Drive / Hugging Face:
   ```bash
   # Example using gdown for Google Drive
   pip install gdown
   gdown "YOUR_GDRIVE_FILE_ID" -O /opt/render/project/src/models/model1/videomae_model1_best.pth
   gdown "YOUR_GDRIVE_FILE_ID" -O /opt/render/project/src/models/model2/videomae_model2_best.pth
   gdown "YOUR_GDRIVE_FILE_ID" -O /opt/render/project/src/models/model4/gender_detection_best.pth
   ```

**Option B — Use a startup script:**
Create `download_models.sh`:
```bash
#!/bin/bash
# Download models on first startup if they don't exist
MODELS_DIR="models"
if [ ! -f "$MODELS_DIR/model1/videomae_model1_best.pth" ]; then
    echo "Downloading VideoMAE Model 1..."
    # wget or curl from your hosting (Google Drive, HF Hub, etc.)
fi
```

### Step 3 — Update CORS for production

In `app.py`, add your Vercel URL:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://your-app.vercel.app",     # ← Add this
        "https://your-custom-domain.com",  # ← Add if custom domain
    ],
    ...
)
```

### Step 4 — Deploy on Render

1. Go to https://render.com → Sign in with GitHub
2. Click **"New +"** → **Web Service**
3. Connect your GitHub repo
4. Configure:
   - **Name:** women-distress-ai-backend
   - **Region:** Oregon (or nearest to you)
   - **Branch:** main
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app:app --host 0.0.0.0 --port $PORT`
   - **Plan:** Standard ($25/mo) — DO NOT use free tier
5. Add **Environment Variables** (one by one):
   ```
   SMTP_HOST     = smtp.gmail.com
   SMTP_PORT     = 587
   SMTP_USER     = your@gmail.com
   SMTP_PASSWORD = your_app_password
   EMAIL_FROM    = your@gmail.com
   ```
6. Click **Create Web Service**
7. Wait for build (10-15 min first time — pip install is heavy)
8. Copy your URL: `https://women-distress-ai-backend.onrender.com`
9. Go back to Vercel → add `VITE_API_URL` = the above URL → Redeploy

---

## PART 2B — Deploy Backend to Railway ($5/month, easier)

Railway is simpler to use than Render and gives you 8GB RAM on hobby plan.

### Step 1 — Install Railway CLI
```bash
npm install -g @railway/cli
railway login
```

### Step 2 — Deploy
```bash
cd /Users/sagars/Documents/Women_Distress_AI

# Initialize Railway project
railway init

# Set environment variables
railway variables set SMTP_HOST=smtp.gmail.com
railway variables set SMTP_PORT=587
railway variables set SMTP_USER=your@gmail.com
railway variables set SMTP_PASSWORD=your_app_password
railway variables set EMAIL_FROM=your@gmail.com

# Deploy
railway up
```

### Step 3 — Create Procfile for Railway
```
web: uvicorn app:app --host 0.0.0.0 --port $PORT
```

### Step 4 — Add runtime.txt
```
python-3.12.0
```

Railway auto-detects Python and runs pip install automatically.

---

## PART 3 — Required Code Changes Before Deployment

### Change 1: Update app.py CORS (REQUIRED)

```python
# app.py — add your Vercel URL
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://YOUR-APP-NAME.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Change 2: Fix FFmpeg path for Linux servers

In `modules/pipeline.py` line 47, the FFmpeg path is hardcoded for macOS:
```python
# CURRENT (macOS only):
"/opt/homebrew/bin/ffmpeg",

# CHANGE TO (works on both macOS and Linux):
"ffmpeg",
```

### Change 3: Update model paths to be environment-aware

In `modules/distress_detector.py` and `violence_detector.py`, paths like
`"models/model1/..."` are relative — this works fine as long as you run
uvicorn from the project root. Render does this correctly by default.

### Change 4: Add a Procfile (for Railway/Render)
```
web: uvicorn app:app --host 0.0.0.0 --port $PORT
```

---

## PART 4 — Vercel Configuration File

Create `frontend/vercel.json` to handle React Router properly:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Without this, refreshing any page other than `/` gives a 404.

---

## PART 5 — Environment Variables Summary

### Vercel (Frontend)
| Variable | Value | Notes |
|---|---|---|
| `VITE_API_URL` | `https://your-backend.onrender.com` | Set AFTER backend is deployed |

### Render / Railway (Backend)
| Variable | Value | Notes |
|---|---|---|
| `SMTP_HOST` | `smtp.gmail.com` | Or your SMTP provider |
| `SMTP_PORT` | `587` | |
| `SMTP_USER` | `your@gmail.com` | Gmail address |
| `SMTP_PASSWORD` | `xxxx xxxx xxxx xxxx` | Gmail App Password (16-char) |
| `EMAIL_FROM` | `your@gmail.com` | Sender display address |

---

## PART 6 — Model Hosting Strategy

The biggest deployment challenge is getting 747MB of model weights onto the server.

### Option A — Google Drive + gdown (Easiest)
1. Upload all model files to Google Drive
2. Make them publicly accessible (Anyone with link → Viewer)
3. Create `download_models.py`:
   ```python
   import os, subprocess
   
   MODELS = {
       "models/model1/videomae_model1_best.pth": "GDRIVE_ID_1",
       "models/model2/videomae_model2_best.pth": "GDRIVE_ID_2",
       "models/model4/gender_detection_best.pth": "GDRIVE_ID_3",
   }
   
   subprocess.run(["pip", "install", "gdown", "-q"])
   import gdown
   
   for path, file_id in MODELS.items():
       os.makedirs(os.path.dirname(path), exist_ok=True)
       if not os.path.exists(path):
           print(f"Downloading {path}...")
           gdown.download(id=file_id, output=path, quiet=False)
   ```
4. Add to `Procfile`:
   ```
   web: python download_models.py && uvicorn app:app --host 0.0.0.0 --port $PORT
   ```

### Option B — Hugging Face Hub (Most Professional)
1. Create account at https://huggingface.co
2. Install HF CLI:
   ```bash
   pip install huggingface_hub
   huggingface-cli login
   ```
3. Upload models:
   ```bash
   huggingface-cli upload YOUR_USERNAME/women-distress-models \
     models/model1/videomae_model1_best.pth \
     models/model2/videomae_model2_best.pth \
     models/model4/gender_detection_best.pth
   ```
4. Download in startup script:
   ```python
   from huggingface_hub import hf_hub_download
   hf_hub_download(repo_id="YOUR_USERNAME/women-distress-models",
                   filename="videomae_model1_best.pth",
                   local_dir="models/model1/")
   ```

### Option C — Render Persistent Disk (Manual upload, most reliable)
1. Add Persistent Disk in Render dashboard (5GB, ~$1.25/mo extra)
2. Mount at `/opt/render/project/src/`
3. Use Render's **Shell** tab to upload files via wget/curl once
4. Files persist across restarts and redeployments

---

## PART 7 — Complete Deployment Checklist

### Before deploying:
- [ ] Update CORS in `app.py` with Vercel URL
- [ ] Change FFmpeg path from `/opt/homebrew/bin/ffmpeg` to `ffmpeg`
- [ ] Create `Procfile` in project root
- [ ] Create `frontend/vercel.json` for React Router
- [ ] Upload model weights to Google Drive / Hugging Face Hub
- [ ] Get Google Drive file IDs or HF repo URL
- [ ] Have Gmail App Password ready (not your login password)
- [ ] Commit and push all changes to GitHub

### Backend deployment:
- [ ] Create Render / Railway account
- [ ] Connect GitHub repo
- [ ] Set all 5 SMTP environment variables
- [ ] Choose Standard plan (Render) or Hobby plan (Railway)
- [ ] Deploy and wait for build
- [ ] Download models to server (via shell or startup script)
- [ ] Test: `curl https://your-backend.onrender.com/` → should return {"status":"online"}

### Frontend deployment:
- [ ] Create Vercel account (log in with GitHub)
- [ ] Import repo on Vercel
- [ ] Set Root Directory = `frontend`
- [ ] Set `VITE_API_URL` = your backend URL
- [ ] Deploy
- [ ] Test: open Vercel URL → login page should load
- [ ] Upload a test video → pipeline should run

---

## PART 8 — Cost Summary

| Scenario | Monthly Cost |
|---|---|
| Frontend only (Vercel) | **FREE** |
| Frontend (Vercel) + Backend (Render Standard) | ~**$25/mo** |
| Frontend (Vercel) + Backend (Railway Hobby) | ~**$5/mo** |
| Frontend (Vercel) + Backend (Render + Persistent Disk) | ~**$26.25/mo** |
| Everything free (college demo) | Use `ngrok` tunnel from your laptop! |

---

## ALTERNATIVE — Free Demo with ngrok (Best for college presentation)

If you just need a temporary public URL for your **college presentation demo**,
you DON'T need to pay anything. Use ngrok to expose your local server:

```bash
# Terminal 1 — Run backend
cd /Users/sagars/Documents/Women_Distress_AI
source venv/bin/activate
uvicorn app:app --reload

# Terminal 2 — Run frontend
cd frontend && npm run dev

# Terminal 3 — Expose backend publicly
brew install ngrok
ngrok http 8000
# ngrok gives you: https://abc123.ngrok.io
```

Then set `VITE_API_URL=https://abc123.ngrok.io` in a `.env.local` file
in the frontend directory and restart `npm run dev`.

Anyone on any device/network can now access your full system.
ngrok free tier = 1 tunnel, 40 connections/min, 8-hour sessions.
Perfect for a college demo!

---

## Quick Reference — Deployment URLs

After deployment, your system will be at:
- Frontend: `https://your-app-name.vercel.app`
- Backend API: `https://your-backend.onrender.com`
- Backend health: `https://your-backend.onrender.com/`
- Predict endpoint: `https://your-backend.onrender.com/predict`

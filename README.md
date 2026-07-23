# Real-time Women Distress Detection using CCTV

> An enterprise-grade AI surveillance system that detects violence, female distress, and weapon threats in real time from CCTV footage — with automated emergency alerts.

---

## 🎯 Project Overview

This system processes live CCTV video streams or uploaded footage through a multi-model AI pipeline:

```
Video Input (CCTV / Uploaded File)
        │
        ▼
┌─────────────────────────┐
│  Model 1: Violence       │  VideoMAE — detects violent activity
│  Detection               │  Accuracy: 94.72%
└────────────┬────────────┘
             │ Violence detected? Continue ↓  |  Normal? Stop.
             ▼
┌─────────────────────────┐
│  Model 2: Distress       │  VideoMAE — classifies distress type
│  Detection               │  Accuracy: 96.29%
│  (Normal/Walking/Running │  Classes: Normal, Walking, Running,
│   Punching/Violence/     │           Punching, Violence, Fall, SOS
│   Fall/SOS)              │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  Model 3: Person         │  YOLO11n + ByteTrack
│  Detection & Tracking    │  Detects and tracks all persons per frame
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  Model 4: Gender         │  EfficientNetV2-S (timm)
│  Classification          │  Trained on PA-100K pedestrian dataset
│                          │  Accuracy: 94.69%
│                          │  Classes: Male / Female
└────────────┬────────────┘
             │ Female detected?
             ▼
┌─────────────────────────┐
│  Face Recognition        │  Identifies known persons
│                          │  Returns: name, confidence, thumbnail
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  Emergency Alert         │  Sends automated email to up to 4
│  System                  │  configured contacts when:
│                          │  gender == Female AND distress == True
└─────────────────────────┘
```

---

## 🏗️ Architecture

| Layer | Technology |
|---|---|
| **Backend API** | FastAPI + Uvicorn |
| **Frontend** | React + TypeScript + Vite |
| **Violence Detection** | VideoMAE (HuggingFace Transformers) |
| **Distress Detection** | VideoMAE (fine-tuned, 7 classes) |
| **Person Detection** | YOLO11n (Ultralytics) |
| **Person Tracking** | ByteTrack (bundled with Ultralytics) |
| **Gender Classification** | EfficientNetV2-S (timm) |
| **Face Recognition** | OpenCV Haar Cascade + face_recognition |
| **Weapon Detection** | Custom YOLO-based detector |
| **Emergency Alerts** | SMTP email via Python smtplib |

---

## 📁 Project Structure

```
Women_Distress_AI/
│
├── app.py                        # FastAPI application entry point
├── config.py                     # Global configuration constants
├── requirements.txt              # Python dependencies
│
├── modules/                      # Core AI pipeline modules
│   ├── pipeline.py               # Orchestrates the full inference pipeline
│   ├── violence_detector.py      # Model 1: VideoMAE violence detection
│   ├── distress_detector.py      # Model 2: VideoMAE distress detection
│   ├── person_detector.py        # Model 3: YOLO11 + ByteTrack detection
│   ├── gender_classifier.py      # Model 4: EfficientNetV2-S gender classifier
│   ├── face_recognizer.py        # Face recognition module
│   ├── weapon_detector.py        # Weapon detection module
│   ├── person.py                 # Person dataclass (track state)
│   ├── person_manager.py         # Manages per-track state across frames
│   ├── video_processor.py        # Video I/O utilities
│   ├── videomae_base.py          # Shared VideoMAE inference base class
│   └── custom_bytetrack.yaml     # ByteTrack tracker configuration
│
├── routes/                       # FastAPI route handlers
│   ├── predict.py                # POST /predict — main analysis endpoint
│   ├── emergency.py              # POST /api/v1/emergency/send
│   └── emergency_contacts.py     # GET/PUT /api/v1/emergency-contacts
│
├── services/                     # Business logic services
│   ├── email_service.py          # SMTP email sending
│   └── emergency_contact_service.py  # Contacts CRUD with validation
│
├── models/                       # AI model weights (see below)
│   ├── model1/                   # VideoMAE violence weights
│   ├── model2/                   # VideoMAE distress weights
│   ├── model3a/                  # YOLO11n weights
│   ├── model4/                   # EfficientNetV2-S gender weights
│   └── tracker/                  # ByteTrack config
│
├── data/                         # Runtime data (gitignored: contacts file)
│   └── README.md
│
├── frontend/                     # React + TypeScript dashboard
│   ├── src/
│   │   ├── pages/dashboard/      # Dashboard, LiveDetection, Settings, etc.
│   │   ├── components/           # Reusable UI components
│   │   ├── services/             # Axios API clients
│   │   └── contexts/             # React context providers
│   └── package.json
│
├── uploads/                      # Uploaded videos (gitignored)
├── outputs/                      # Processed output videos (gitignored)
└── logs/                         # Runtime logs (gitignored)
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- macOS / Linux (Windows may need path adjustments)
- FFmpeg (`brew install ffmpeg` on macOS)
- GPU optional but recommended (CUDA 11.8+)

### Backend Setup

```bash
# 1. Clone the repository
git clone https://github.com/Sagarspoojary/Real-time-women-distress-detection-using-CCTV.git
cd Real-time-women-distress-detection-using-CCTV

# 2. Create virtual environment
python3 -m venv venv
source venv/bin/activate          # macOS/Linux
# venv\Scripts\activate           # Windows

# 3. Install dependencies
pip install -r requirements.txt

# 4. Download model weights (see Models section below)

# 5. Configure environment variables
cp .env.example .env              # then edit with your SMTP credentials

# 6. Start the backend
uvicorn app:app --reload
# Backend runs at http://127.0.0.1:8000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
# Frontend runs at http://localhost:5173
```

---

## 🤖 Models

The model weights are NOT included in this repository due to their size. Download them separately and place in the `models/` directory.

| Model | File | Size | Description |
|---|---|---|---|
| Violence Detection | `models/model1/videomae_model1_best.pth` | ~329 MB | VideoMAE fine-tuned on violence dataset |
| Distress Detection | `models/model2/videomae_model2_best.pth` | ~329 MB | VideoMAE fine-tuned on 7-class distress dataset |
| Person Detection | `models/model3a/yolo11n.pt` | ~5.6 MB | YOLO11n (Ultralytics) |
| Gender Classification | `models/model4/gender_detection_best.pth` | ~78 MB | EfficientNetV2-S trained on PA-100K |

> **Gender Model Training:** EfficientNetV2-S trained on the PA-100K pedestrian attribute dataset (100,000 images). Input: 224×224, ImageNet normalization. Classes: 0=Male, 1=Female. Peak val accuracy: **94.69%**.

---

## ⚙️ Environment Variables

Create a `.env` file in the project root:

```env
# SMTP Email Configuration (for emergency alerts)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
EMAIL_FROM=your_email@gmail.com
```

> Use a Gmail App Password (not your regular password). Enable 2FA then generate at: Google Account → Security → App passwords.

---

## 📡 API Reference

### Analyze Video
```http
POST /predict
Content-Type: multipart/form-data

file: <video_file>
```
Returns full pipeline results including violence, distress, all detected persons with gender/identity/weapon data.

### Emergency Contacts
```http
GET  /api/v1/emergency-contacts          # Get current contacts
PUT  /api/v1/emergency-contacts          # Update all 4 contact slots
```

### Send Emergency Alert
```http
POST /api/v1/emergency/send
Content-Type: application/json

{
  "track_id": 5,
  "gender": "Female",
  "distress": true,
  "video_name": "cctv_feed.mp4"
}
```

---

## 🖥️ Frontend Dashboard

The React dashboard includes:

| Page | Description |
|---|---|
| **Dashboard Home** | Live summary metrics and recent activity |
| **Live Detection Center** | Upload video and view real-time analysis results |
| **Analysis History** | Browse past video analysis sessions |
| **Incident Center** | View and manage flagged incidents |
| **Reports** | Evidence download and export |
| **Settings** | Profile, emergency contacts, SMTP config, system admin |

---

## 🎨 Detection Overlay

The annotated output video uses gender-coded bounding boxes:

| Color | Meaning |
|---|---|
| 🟣 **Pink** | Female detected |
| 🔵 **Blue** | Male detected |
| 🔴 **Red** | High threat (distress or weapon) |
| 🟡 **Amber** | Gender unknown |

Each person's info card shows: `Track ID`, `Confidence`, `Gender %`, `Weapon`, `Pose`, `Threat Level`, `Identity`.

---

## 🔔 Emergency Alert Logic

An email alert is dispatched **only when all three conditions are met simultaneously**:

```python
gender == "Female"
AND distress == True
AND female_distress_confidence >= threshold
```

Male distress, normal activity, walking, and running do NOT trigger alerts.

---

## 🛡️ Privacy & Ethics

- No video footage is stored permanently — uploads are processed and can be deleted
- Face recognition is opt-in and requires a pre-enrolled face database
- Emergency alerts are human-reviewed before action
- All data is processed locally — no cloud inference

---

## 📊 Model Performance

| Model | Dataset | Accuracy |
|---|---|---|
| Violence Detection | Custom violence dataset | 94.72% |
| Distress Detection | Custom 7-class dataset | 96.29% |
| Gender Classification | PA-100K (100k pedestrian images) | 94.69% |

---

## 📦 Tech Stack

**Backend:** Python 3.12, FastAPI, PyTorch 2.13, HuggingFace Transformers, Ultralytics YOLO11, timm, OpenCV

**Frontend:** React 18, TypeScript, Vite, Axios

---

## 👤 Author

**Sagar S Poojary**  
[GitHub: @Sagarspoojary](https://github.com/Sagarspoojary)

---

## 📄 License

This project is for academic and research purposes.

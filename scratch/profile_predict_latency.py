import os
import sys
import time
import cv2
import torch

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"

from modules.pipeline import WomenDistressPipeline
from modules.violence_detector import ViolenceDetector
from modules.distress_detector import DistressDetector
from modules.person_detector import PersonDetector
from modules.person_manager import PersonManager
from modules.track_validator import TrackValidator
from services.alert_dispatcher import AlertDispatcher

def profile_video(video_path: str):
    print("=" * 70)
    print(f"PROFILING FULL PIPELINE ON: {video_path}")
    print("=" * 70)
    
    cap = cv2.VideoCapture(video_path)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    duration_s = total_frames / fps if fps > 0 else 0
    cap.release()
    file_size = os.path.getsize(video_path)
    print(f"Video Stats: {total_frames} frames, {fps:.1f} FPS, {duration_s:.2f}s duration, {file_size} bytes")

    timings = {}

    # Stage 1: Model 1 VideoMAE (Violence)
    t0 = time.perf_counter()
    m1 = ViolenceDetector()
    timings["model1_init"] = (time.perf_counter() - t0) * 1000.0

    t0 = time.perf_counter()
    m1_res = m1.predict(video_path)
    timings["model1_predict"] = (time.perf_counter() - t0) * 1000.0
    print(f"Stage 1 - Model 1 (Violence): {timings['model1_predict']:.1f}ms | Pred: {m1_res['prediction']} ({m1_res['confidence']}%)")

    # Stage 2: Model 2 VideoMAE (Distress)
    t0 = time.perf_counter()
    m2 = DistressDetector()
    timings["model2_init"] = (time.perf_counter() - t0) * 1000.0

    t0 = time.perf_counter()
    m2_res = m2.predict(video_path)
    timings["model2_predict"] = (time.perf_counter() - t0) * 1000.0
    print(f"Stage 2 - Model 2 (Distress): {timings['model2_predict']:.1f}ms | Pred: {m2_res['prediction']} ({m2_res['confidence']}%)")

    # Stage 3: Model 3 (PersonDetector - YOLO, Tracking, Gender)
    pm = PersonManager()
    t0 = time.perf_counter()
    pdet = PersonDetector()
    timings["person_detector_init"] = (time.perf_counter() - t0) * 1000.0

    t0 = time.perf_counter()
    latest_frame = pdet.detect(
        video_path,
        pm,
        dispatcher=None,
        distress_type=m2_res.get("prediction", "Unknown"),
        distress_confidence=m2_res.get("confidence", 0.0) / 100.0,
        violence_type=m1_res.get("prediction", "VIOLENCE"),
        violence_confidence=m1_res.get("confidence", 0.0) / 100.0,
    )
    timings["person_detector_detect"] = (time.perf_counter() - t0) * 1000.0
    people = pm.get_all()
    validator = TrackValidator()
    people = validator.validate(people)
    print(f"Stage 3 - PersonDetector (YOLO + ByteTrack + Gender): {timings['person_detector_detect']:.1f}ms | Frames processed: {latest_frame} | People detected: {len(people)}")

    # Stage 4: Alert Dispatcher Evaluation & Incident Persistence
    disp = AlertDispatcher()
    t0 = time.perf_counter()
    pipeline_result = {
        "model1": m1_res,
        "model2": m2_res,
        "model3": {"people_detected": len(people), "frames_processed": latest_frame},
        "persons": [vars(p) for p in people],
        "status": "Distress Detected"
    }
    incident_id = disp.maybe_dispatch(pipeline_result, video_path)
    timings["alert_dispatcher_dispatch"] = (time.perf_counter() - t0) * 1000.0
    print(f"Stage 4 - AlertDispatcher (Persistence & Job Enqueue): {timings['alert_dispatcher_dispatch']:.1f}ms | Incident: {incident_id}")

    total_pipeline_ms = timings["model1_predict"] + timings["model2_predict"] + timings["person_detector_detect"] + timings["alert_dispatcher_dispatch"]
    print("-" * 70)
    print("TOTAL BREAKDOWN:")
    for k, v in timings.items():
        print(f"  {k:30s}: {v:8.1f} ms  ({v/1000.0:6.2f} s)")
    print(f"  {'TOTAL PIPELINE':30s}: {total_pipeline_ms:8.1f} ms  ({total_pipeline_ms/1000.0:6.2f} s)")
    print("=" * 70)

if __name__ == "__main__":
    profile_video("uploads/V_11.mp4")

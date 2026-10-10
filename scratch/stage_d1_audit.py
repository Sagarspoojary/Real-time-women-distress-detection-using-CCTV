import os
import time
import json
import logging
from collections import deque
import threading

import torch
import cv2
import numpy as np

# Mock the AlertDispatcher to prevent real notifications during test
from services.alert_dispatcher import AlertDispatcher
AlertDispatcher.maybe_dispatch = lambda *args, **kwargs: logging.info("[MOCK] Alert dispatched.")

from modules.webcam_stream_processor import WebcamStreamProcessor
from modules.ip_webcam_processor import IPWebcamStreamProcessor

logging.basicConfig(level=logging.INFO, format='%(levelname)s:%(name)s:%(message)s')

def run_audit(duration_seconds=600):
    print("============================================================")
    print("STEP D.1: PHYSICAL HARDWARE CONCURRENCY AUDIT (GTX 1650)")
    print("============================================================")
    print(f"CUDA Available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"GPU: {torch.cuda.get_device_name(0)}")
    
    print("\n[INFO] Initializing WebcamStreamProcessor...")
    processor = WebcamStreamProcessor(camera_id="BENCHMARK-CAM")
    
    # Track stats
    start_time = time.monotonic()
    
    print("\n[INFO] Starting camera pipeline for 10-minute audit...")
    processor.start()
    
    # Warm-up phase
    print("Warming up for 30 seconds...")
    time.sleep(30)
    
    # Reset stats after warm-up
    warmup_frames = processor._frames_processed
    processor._inference_timestamps.clear()
    
    print(f"\n[INFO] Warm-up complete. Starting {duration_seconds}-second measurement period.")
    measurement_start = time.monotonic()
    
    # Track metrics
    ai_latencies = []
    camera_fps_samples = []
    
    try:
        while time.monotonic() - measurement_start < duration_seconds:
            time.sleep(5)
            stats = processor.status()
            ai_latencies.append(stats['inference_time_ms'])
            camera_fps_samples.append(stats['camera_fps'])
            
            # Print periodic heartbeat
            elapsed = time.monotonic() - measurement_start
            print(f"Elapsed: {elapsed:.1f}s | Cam FPS: {stats['camera_fps']:.1f} | AI Latency: {stats['inference_time_ms']:.1f}ms | Threat: {stats['threat_state']}")
            
            if torch.cuda.is_available():
                allocated = torch.cuda.memory_allocated() / (1024 ** 2)
                reserved = torch.cuda.memory_reserved() / (1024 ** 2)
                print(f"VRAM - Allocated: {allocated:.1f}MB | Reserved: {reserved:.1f}MB")
                
    except KeyboardInterrupt:
        print("Audit interrupted by user.")
        
    print("\n[INFO] Stopping processor...")
    processor.stop()
    
    # Analyze
    total_frames = processor._frames_processed - warmup_frames
    test_duration = time.monotonic() - measurement_start
    avg_capture_fps = total_frames / test_duration
    
    ai_latencies = [l for l in ai_latencies if l > 0]
    median_latency = np.median(ai_latencies) if ai_latencies else 0.0
    p95_latency = np.percentile(ai_latencies, 95) if ai_latencies else 0.0
    
    print("\n============================================================")
    print("AUDIT RESULTS")
    print("============================================================")
    print(f"Test Duration       : {test_duration:.1f} seconds")
    print(f"Frames Captured     : {total_frames}")
    print(f"Avg Camera FPS      : {avg_capture_fps:.2f}")
    print(f"Median AI Latency   : {median_latency:.2f} ms")
    print(f"P95 AI Latency      : {p95_latency:.2f} ms")
    if torch.cuda.is_available():
        print(f"Peak VRAM Reserved  : {torch.cuda.max_memory_reserved() / (1024**2):.1f} MB")
    print("============================================================")
    print("Copy these results into your prompt to update the documentation.")

if __name__ == "__main__":
    # Test for 10 minutes (600 seconds)
    run_audit(600)

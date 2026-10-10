import time
import torch
import numpy as np
from modules.violence_detector import ViolenceDetector
from modules.distress_detector import DistressDetector
from modules.person_detector import PersonDetector

print("Loading models...")
m1 = ViolenceDetector()
print("Violence detector loaded.")

frames = [np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8) for _ in range(16)]

# Warmup
print("Warming up...")
m1.predict_frames(frames)
if torch.cuda.is_available():
    torch.cuda.synchronize()

print("Benchmarking...")
latencies = []
for _ in range(5):
    start = time.perf_counter()
    m1.predict_frames(frames)
    if torch.cuda.is_available():
        torch.cuda.synchronize()
    end = time.perf_counter()
    latencies.append((end - start) * 1000)

print(f"Mean VideoMAE 1 Latency: {np.mean(latencies):.2f} ms")

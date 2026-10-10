import time
import torch
import numpy as np
import sys
from modules.violence_detector import ViolenceDetector

def benchmark_instrumentation():
    print("=" * 60)
    print("PHASE 1: INSTRUMENTED VIDEOMAE BASELINE")
    print("=" * 60)
    
    cuda_avail = torch.cuda.is_available()
    print(f"CUDA Available: {cuda_avail}")
    
    if not cuda_avail:
        print("[WARNING] Running on CPU! GPU validation is blocked.")

    model = ViolenceDetector()
    frames = [np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8) for _ in range(16)]

    times = {
        "preprocessing": [],
        "h2d_transfer": [],
        "forward_pass": [],
        "d2h_post": [],
        "total": []
    }
    
    def instrumented_predict(frames_input):
        if torch.cuda.is_available(): torch.cuda.synchronize()
        t0 = time.perf_counter()
        
        # 1. Preprocessing
        inputs = model.image_processor(frames_input, return_tensors="pt")
        if torch.cuda.is_available(): torch.cuda.synchronize()
        t1 = time.perf_counter()
        
        # 2. Host-to-device transfer
        pixel_values = inputs["pixel_values"].to(model.device)
        if torch.cuda.is_available(): torch.cuda.synchronize()
        t2 = time.perf_counter()
        
        # 3. Forward pass
        with torch.inference_mode():
            with torch.autocast(device_type="cuda" if torch.cuda.is_available() else "cpu", dtype=torch.float16):
                outputs = model.model(pixel_values)
                probs = torch.nn.functional.softmax(outputs.logits, dim=1)
        if torch.cuda.is_available(): torch.cuda.synchronize()
        t3 = time.perf_counter()
        
        # 4. Device-to-host & postprocessing
        confidence, pred_idx = torch.max(probs, dim=1)
        res = {
            "prediction": model.class_names[pred_idx.item()],
            "confidence": round(confidence.item() * 100, 2)
        }
        if torch.cuda.is_available(): torch.cuda.synchronize()
        t4 = time.perf_counter()
        
        times["preprocessing"].append((t1 - t0) * 1000)
        times["h2d_transfer"].append((t2 - t1) * 1000)
        times["forward_pass"].append((t3 - t2) * 1000)
        times["d2h_post"].append((t4 - t3) * 1000)
        times["total"].append((t4 - t0) * 1000)
        
        return res

    print("\nRunning warm-up (3 iterations)...")
    for _ in range(3):
        instrumented_predict(frames)

    # Clear warm-up times
    for k in times:
        times[k].clear()

    iterations = 30
    print(f"\nRunning {iterations} measured iterations...")
    for _ in range(iterations):
        instrumented_predict(frames)
        
    print("\n" + "-" * 40)
    print("TIMING RESULTS (median | P95)")
    print("-" * 40)
    
    for stage in ["preprocessing", "h2d_transfer", "forward_pass", "d2h_post", "total"]:
        med = np.median(times[stage])
        p95 = np.percentile(times[stage], 95)
        print(f"{stage.ljust(15)} : {med:>7.2f} ms | {p95:>7.2f} ms")

if __name__ == "__main__":
    benchmark_instrumentation()

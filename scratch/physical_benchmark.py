import time
import torch
import numpy as np
import sys
from modules.violence_detector import ViolenceDetector

def run_physical_benchmark():
    print("=" * 60)
    print("STAGE 2.2: PHYSICAL LAPTOP HARDWARE VALIDATION")
    print("=" * 60)
    
    print(f"Python Version: {sys.version}")
    
    cuda_avail = torch.cuda.is_available()
    print(f"CUDA Available: {cuda_avail}")
    
    if not cuda_avail:
        print("\n[ERROR] CUDA is not available. GPU validation is BLOCKED.")
        print("Please ensure you are running on the GTX 1650 with the correct PyTorch wheels.")
        return

    device_name = torch.cuda.get_device_name(0)
    total_memory = torch.cuda.get_device_properties(0).total_memory / (1024 ** 2)
    print(f"GPU Device: {device_name}")
    print(f"Total VRAM: {total_memory:.2f} MB")
    
    print("\nInitializing VideoMAE (Violence Detector)...")
    torch.cuda.reset_peak_memory_stats()
    model = ViolenceDetector()
    
    print(f"Model placed on device: {model.device}")
    
    # Generate synthetic identical frames
    frames = [np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8) for _ in range(16)]

    # --- FP32 Benchmark ---
    print("\n" + "-" * 40)
    print("FP32 Benchmark (Original)")
    print("-" * 40)
    fp32_predictions = []
    fp32_latencies = []
    
    print("Running Warm-up (1/1)...")
    start = time.perf_counter()
    model.predict_frames(frames)
    torch.cuda.synchronize()
    print(f"Warm-up duration: {(time.perf_counter() - start) * 1000:.2f} ms")

    for i in range(10):
        start = time.perf_counter()
        pred = model.predict_frames(frames)
        torch.cuda.synchronize()
        end = time.perf_counter()
        
        fp32_latencies.append((end - start) * 1000)
        fp32_predictions.append(pred)

    fp32_median = np.median(fp32_latencies)
    fp32_p95 = np.percentile(fp32_latencies, 95)
    fp32_peak_mem = torch.cuda.max_memory_allocated() / (1024 ** 2)
    
    print(f"FP32 Median Latency: {fp32_median:.2f} ms")
    print(f"FP32 P95 Latency: {fp32_p95:.2f} ms")
    print(f"FP32 Peak VRAM: {fp32_peak_mem:.2f} MB")
    print(f"Sample FP32 Output: {fp32_predictions[0]}")

    # --- FP16 Benchmark ---
    print("\n" + "-" * 40)
    print("FP16 Benchmark (Autocast & Inference Mode)")
    print("-" * 40)
    fp16_predictions = []
    fp16_latencies = []
    torch.cuda.reset_peak_memory_stats()
    
    # Monkey patch for the benchmark test
    def optimized_predict(frames_input):
        inputs = model.image_processor(frames_input, return_tensors="pt")
        pixel_values = inputs["pixel_values"].to(model.device)
        
        with torch.inference_mode():
            with torch.autocast(device_type="cuda", dtype=torch.float16):
                outputs = model.model(pixel_values)
                probs = torch.nn.functional.softmax(outputs.logits, dim=1)
                
                # Check for NaN/Inf
                if torch.isnan(probs).any() or torch.isinf(probs).any():
                    print("[WARNING] NaN or Inf detected in FP16 output!")
                
                confidence, pred_idx = torch.max(probs, dim=1)
                
        return {
            "prediction": model.class_names[pred_idx.item()],
            "confidence": round(confidence.item() * 100, 2)
        }

    print("Running Warm-up (1/1)...")
    start = time.perf_counter()
    optimized_predict(frames)
    torch.cuda.synchronize()
    print(f"Warm-up duration: {(time.perf_counter() - start) * 1000:.2f} ms")

    for i in range(10):
        start = time.perf_counter()
        pred = optimized_predict(frames)
        torch.cuda.synchronize()
        end = time.perf_counter()
        
        fp16_latencies.append((end - start) * 1000)
        fp16_predictions.append(pred)

    fp16_median = np.median(fp16_latencies)
    fp16_p95 = np.percentile(fp16_latencies, 95)
    fp16_peak_mem = torch.cuda.max_memory_allocated() / (1024 ** 2)
    
    print(f"FP16 Median Latency: {fp16_median:.2f} ms")
    print(f"FP16 P95 Latency: {fp16_p95:.2f} ms")
    print(f"FP16 Peak VRAM: {fp16_peak_mem:.2f} MB")
    print(f"Sample FP16 Output: {fp16_predictions[0]}")

    print("\n" + "=" * 60)
    print("COMPARISON RESULTS")
    print("=" * 60)
    
    agreements = sum(1 for a, b in zip(fp32_predictions, fp16_predictions) if a['prediction'] == b['prediction'])
    print(f"Predicted Class Agreement: {agreements}/10 ({(agreements/10)*100:.0f}%)")
    
    conf_diffs = [abs(a['confidence'] - b['confidence']) for a, b in zip(fp32_predictions, fp16_predictions)]
    print(f"Average Confidence Difference: {np.mean(conf_diffs):.2f}%")
    
    if fp16_median < fp32_median:
        print(f"Speedup: {fp32_median / fp16_median:.2f}x")
    else:
        print("[WARNING] FP16 is slower than FP32 on this hardware.")
        
    print("\nNOTE: Please update docs/stage2_2_physical_benchmark.md with these exact values.")

if __name__ == "__main__":
    run_physical_benchmark()

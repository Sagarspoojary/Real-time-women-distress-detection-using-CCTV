import time
import torch
import numpy as np
from modules.violence_detector import ViolenceDetector

def benchmark_videomae():
    print("Initializing VideoMAE (Violence Detector)...")
    model = ViolenceDetector()
    frames = [np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8) for _ in range(16)]

    print("--- FP32 Benchmark ---")
    fp32_predictions = []
    fp32_latencies = []
    
    # Warmup
    model.predict_frames(frames)
    if torch.cuda.is_available(): torch.cuda.synchronize()

    for _ in range(5):
        start = time.perf_counter()
        pred = model.predict_frames(frames)
        if torch.cuda.is_available(): torch.cuda.synchronize()
        end = time.perf_counter()
        
        fp32_latencies.append((end - start) * 1000)
        fp32_predictions.append(pred)

    fp32_mean = np.mean(fp32_latencies)
    fp32_p95 = np.percentile(fp32_latencies, 95)
    print(f"FP32 Mean Latency: {fp32_mean:.2f} ms")
    print(f"FP32 P95 Latency: {fp32_p95:.2f} ms")
    print(f"Sample FP32 Output: {fp32_predictions[0]}")

    print("\n--- FP16 Benchmark (Autocast & Inference Mode) ---")
    fp16_predictions = []
    fp16_latencies = []

    # Monkey patch the method to use FP16 and inference_mode
    original_predict = model.predict_frames
    
    def optimized_predict(frames_input):
        inputs = model.image_processor(frames_input, return_tensors="pt")
        pixel_values = inputs["pixel_values"].to(model.device)
        
        with torch.inference_mode():
            with torch.autocast(device_type="cuda", dtype=torch.float16):
                outputs = model.model(pixel_values)
                probs = torch.nn.functional.softmax(outputs.logits, dim=1)
                confidence, pred_idx = torch.max(probs, dim=1)
                
        return {
            "prediction": model.class_names[pred_idx.item()],
            "confidence": round(confidence.item() * 100, 2)
        }

    # Warmup
    optimized_predict(frames)
    if torch.cuda.is_available(): torch.cuda.synchronize()

    for _ in range(5):
        start = time.perf_counter()
        pred = optimized_predict(frames)
        if torch.cuda.is_available(): torch.cuda.synchronize()
        end = time.perf_counter()
        
        fp16_latencies.append((end - start) * 1000)
        fp16_predictions.append(pred)

    fp16_mean = np.mean(fp16_latencies)
    fp16_p95 = np.percentile(fp16_latencies, 95)
    print(f"FP16 Mean Latency: {fp16_mean:.2f} ms")
    print(f"FP16 P95 Latency: {fp16_p95:.2f} ms")
    print(f"Sample FP16 Output: {fp16_predictions[0]}")

    # Check for NaN/Inf
    print(f"\nAgreement Check: FP32 Output == FP16 Output? {fp32_predictions[0] == fp16_predictions[0]}")
    if fp16_mean < fp32_mean:
        print(f"Speedup: {fp32_mean / fp16_mean:.2f}x")

if __name__ == "__main__":
    benchmark_videomae()

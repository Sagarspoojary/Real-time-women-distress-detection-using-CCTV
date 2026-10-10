import os
import sys
import time
import json
import numpy as np
from unittest.mock import patch, MagicMock
import argparse

sys.path.append(os.path.abspath("."))
import modules.webcam_stream_processor
from modules.webcam_stream_processor import WebcamStreamProcessor

def main(video_path, max_frames):
    print(f"Starting Physical End-to-End Test for SOS Validation")
    print(f"Video Path: {video_path}")
    
    if not os.path.exists(video_path):
        print(f"ERROR: Video file {video_path} not found.")
        sys.exit(1)

    # Monkey-patch WEBCAM_INDEX to point to the file path instead of an integer camera index.
    modules.webcam_stream_processor.WEBCAM_INDEX = video_path

    # Track metrics
    predictions_log = []
    threat_transitions = []
    
    # Mock Email, SMS, Voice
    mock_email = MagicMock()
    mock_sms = MagicMock()
    mock_voice = MagicMock()
    mock_evidence = MagicMock(return_value=("mock_vid.mp4", "mock_snap.jpg"))
    
    processor = WebcamStreamProcessor(camera_id="TEST-END-TO-END")

    # Wrapper to intercept pipeline results without changing them
    original_process_videomae = processor._pipeline.process_videomae
    
    def wrapped_process_videomae(frames):
        result = original_process_videomae(frames)
        predictions_log.append({
            "timestamp": time.time(),
            "model1": result.get("model1", {}),
            "model2": result.get("model2", {})
        })
        return result
        
    processor._pipeline.process_videomae = wrapped_process_videomae

    with patch("services.alert_dispatcher.EmailService.send_email_with_attachments", mock_email), \
         patch("services.alert_dispatcher.SMSService.send_sms", mock_sms), \
         patch("services.alert_dispatcher.VoiceService.initiate_call", mock_voice), \
         patch("modules.webcam_stream_processor.EvidenceRecorder.save_evidence", mock_evidence):

        # Start the background worker
        processor.start()
        
        start_t = time.time()
        last_state = processor._threat_state
        frames_seen = 0
        
        try:
            while True:
                time.sleep(0.5)
                status = processor.status()
                
                # Check for state transitions
                if status["threat_state"] != last_state:
                    threat_transitions.append({
                        "time": time.time() - start_t,
                        "from": last_state,
                        "to": status["threat_state"]
                    })
                    last_state = status["threat_state"]
                
                frames_seen = status["frames_processed"]
                pred = status["predicted_class"]
                conf = status["confidence"]
                
                # We only want to record if it's actively inferencing (not just looping the same prediction)
                # But since we just poll status, we might overcount. So let's just track unique timestamps.
                # Actually, wait, processor._inference_timestamps holds recent ones.
                
                if not status["running"]:
                    print("Processor stopped running (likely EOF).")
                    break
                    
                if max_frames and frames_seen >= max_frames:
                    print(f"Reached max frames {max_frames}.")
                    break

                if time.time() - start_t > 300: # 5 min timeout
                    print("Timeout reached.")
                    break
                    
        except KeyboardInterrupt:
            print("Interrupted by user.")
        
        processor.stop()
        
    # Analyze results
    # Since we polled, we don't have perfect per-inference logs, but we have the overall state.
    # To get perfect inference logs, we'd need to mock process_videomae to intercept. 
    # Let's see if an incident was created.
    incident_id = status["last_incident_id"]
    emails_sent = mock_email.call_count
    sms_sent = mock_sms.call_count
    
    # Just looking for THREAT ACTIVE
    threat_active = status["threat_active"]
    
    sos_above = sum(1 for p in predictions_log if p.get("model2", {}).get("prediction") == "SOS" and p.get("model2", {}).get("confidence", 0) >= 75.0)
    sos_below = sum(1 for p in predictions_log if p.get("model2", {}).get("prediction") == "SOS" and p.get("model2", {}).get("confidence", 0) < 75.0)
    
    outcome = "SOS_NOT_DETECTED"
    if sos_above > 0 and threat_active and emails_sent > 0:
        outcome = "SOS_PIPELINE_VALIDATED"
    elif sos_above > 0 and (not threat_active or emails_sent == 0):
        outcome = "SOS_DETECTED_DOWNSTREAM_FAILURE"
        
    report = {
        "input_video": video_path,
        "duration_seconds": time.time() - start_t,
        "frames_processed": frames_seen,
        "threat_state_transitions": threat_transitions,
        "incident_created": incident_id is not None,
        "incident_id": incident_id,
        "mock_email_invocations": emails_sent,
        "mock_sms_invocations": sms_sent,
        "median_latency_ms": status["inference_time_ms"], # Approximation
        "sos_predictions_above_threshold": sos_above,
        "sos_predictions_below_threshold": sos_below,
        "total_inference_windows": len(predictions_log),
        "final_status_outcome": outcome,
        "detailed_predictions": predictions_log
    }
    
    with open("scratch/test_out/report.json", "w") as f:
        json.dump(report, f, indent=2)
        
    # Also Markdown report
    md = f"""# Physical SOS Validation Report
## Input Video
- **Path**: {video_path}
- **Duration**: {time.time() - start_t:.2f}s
- **Frames Processed**: {frames_seen}
- **Inference Windows Evaluated**: {len(predictions_log)}

## SOS Detections
- **Above Threshold (>= 75.0%)**: {sos_above}
- **Below Threshold (< 75.0%)**: {sos_below}

## Outcomes
- **Outcome**: {outcome}
- **Incident ID**: {incident_id}
- **Emails Mocked**: {emails_sent}
- **SMS Mocked**: {sms_sent}

## Transitions
"""
    for t in threat_transitions:
        md += f"- At {t['time']:.2f}s: {t['from']} -> {t['to']}\n"
        
    with open("scratch/test_out/report.md", "w") as f:
        f.write(md)
        
    print(f"\nFinal Outcome: {outcome}")
    print("Report saved to scratch/test_out/")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", type=str, required=True, help="Path to SOS test video")
    parser.add_argument("--max-frames", type=int, default=1000, help="Max frames to process")
    args = parser.parse_args()
    
    os.makedirs("scratch/test_out", exist_ok=True)
    main(args.video, args.max_frames)

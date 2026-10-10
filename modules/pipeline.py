from modules.violence_detector import ViolenceDetector
from modules.distress_detector import DistressDetector
from modules.person_detector import PersonDetector
from modules.person_manager import PersonManager
from modules.track_validator import TrackValidator
from alerts.alert_dispatcher import AlertDispatcher

class WomenDistressPipeline:

    def __init__(self):

        self.model1 = ViolenceDetector()
        self.model2 = DistressDetector()
        self.model3 = PersonDetector()

        self.person_manager = PersonManager()
        self.validator = TrackValidator()

        # Alert dispatcher — one instance, shared across all requests.
        # Cooldown state is maintained per track_id across the lifetime of the server.
        self.dispatcher = AlertDispatcher()

    def process(self, video_path):

        result = {
            "model1": None,
            "model2": None,
            "model3": {
                "people_detected": 0,
                "frames_processed": 0
            },
            "persons": [],
            "status": "No distress detected"
        }

        # =====================================================
        # MODEL 1 : Violence Detection
        # =====================================================

        model1 = self.model1.predict(video_path)

        result["model1"] = model1

        if model1["prediction"] == "Normal":
            # Overwrite the old processed video with the H.264 version of the current normal video
            import subprocess
            import os
            final_output = "outputs/debug_tracking.mp4"
            try:
                if os.path.exists(final_output):
                    os.remove(final_output)
                cmd = [
                    "ffmpeg",
                    "-y",
                    "-i", video_path,
                    "-vcodec", "libx264",
                    "-pix_fmt", "yuv420p",
                    final_output
                ]
                subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            except Exception as e:
                print(f"FFmpeg copy failed for normal video: {e}")
            return result

        # =====================================================
        # MODEL 2 : Distress Detection
        # =====================================================

        model2 = self.model2.predict(video_path)

        result["model2"] = model2

        # Extract model1 violence info
        model1_pred = model1.get("prediction", "VIOLENCE")
        model1_conf = model1.get("confidence", 0.0) / 100.0 if isinstance(model1.get("confidence"), (int, float)) else 0.7517

        # Extract distress info to pass into the frame-by-frame loop
        distress_type       = model2.get("prediction", "Unknown")
        distress_confidence = model2.get("confidence", 0.0) / 100.0  # convert % → 0–1

        # =====================================================
        # MODEL 3 : Person Detection + Tracking
        # =====================================================

        # Clear tracking state for the new video
        self.person_manager.clear()

        # Reset all alert cooldowns so each new video starts fresh
        self.dispatcher.reset_all()

        # Process the complete video frame-by-frame.
        # Pass the dispatcher + distress context so real-time alerts can fire
        # from inside the frame loop the moment Female + distress is confirmed.
        latest_frame = self.model3.detect(
            video_path,
            self.person_manager,
            dispatcher=self.dispatcher,
            distress_type=distress_type,
            distress_confidence=distress_confidence,
            violence_type=model1_pred,
            violence_confidence=model1_conf,
        )

        # Remove stale tracks
        stale_ids = self.person_manager.remove_stale(latest_frame)
        for sid in stale_ids:
            self.dispatcher.reset_track(sid)

        # Get all tracked people
        people = self.person_manager.get_all()

        people = self.validator.validate(people)

        result["model3"] = {
            "people_detected": len(people),
            "frames_processed": latest_frame
        }

        # Set distress flag on tracked persons if AI models detected violence/distress
        has_distress = (
            (model1 and model1.get("prediction") in {"Violence", "Assault"}) or
            (model2 and model2.get("prediction") in {"Punching", "Violence", "Fall", "SOS"})
        )
        if has_distress:
            for person in people:
                person.distress = True

        result["persons"] = [
            vars(person)
            for person in people
        ]

        # =====================================================
        # Final Status
        # =====================================================

        result["status"] = "Distress Detected"

        return result

    def process_videomae(self, raw_frames):
        """Processes 16 BGR numpy frames directly from live camera stream."""
        import cv2
        rgb_frames = [cv2.cvtColor(f, cv2.COLOR_BGR2RGB) for f in raw_frames]

        model1 = self.model1.predict_frames(rgb_frames)
        model2 = self.model2.predict_frames(rgb_frames)

        result = {
            "model1": model1,
            "model2": model2,
            "status": "No distress detected"
        }

        if model1["prediction"] == "Normal" and model2["prediction"] == "Normal":
            return result

        result["status"] = "Distress Detected"
        return result

    def process_yolo(self, raw_frame, frame_count, has_distress):
        """Runs YOLO person detection and tracking on a single frame."""
        annotated_frame = self.model3.detect_on_frame(raw_frame, self.person_manager, frame_count)
        
        people = self.person_manager.get_all()
        
        valid_people = [p for p in people if p.confidence >= 0.45]

        if has_distress:
            for person in valid_people:
                person.distress = True

        result = {
            "model3": {"people_detected": len(valid_people), "frames_processed": frame_count},
            "persons": [vars(person) for person in valid_people],
            "annotated_frame": annotated_frame,
        }
        return result
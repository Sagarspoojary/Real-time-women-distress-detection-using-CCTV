from modules.violence_detector import ViolenceDetector
from modules.distress_detector import DistressDetector
from modules.person_detector import PersonDetector
from modules.person_manager import PersonManager
from modules.track_validator import TrackValidator

class WomenDistressPipeline:

    def __init__(self):

        self.model1 = ViolenceDetector()
        self.model2 = DistressDetector()
        self.model3 = PersonDetector()

        self.person_manager = PersonManager()
        self.validator = TrackValidator()
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
                    "/opt/homebrew/bin/ffmpeg",
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

        # =====================================================
        # MODEL 3 : Person Detection + Tracking
        # =====================================================

        # Clear tracking for a new video
        self.person_manager.clear()

        # Process the complete video frame-by-frame
        latest_frame = self.model3.detect(
            video_path,
            self.person_manager
        )

        # Remove stale tracks
        self.person_manager.remove_stale(latest_frame)

        # Get all tracked people
        people = self.person_manager.get_all()

        people = self.validator.validate(people)

        result["model3"] = {
            "people_detected": len(people),
            "frames_processed": latest_frame
        }

        result["persons"] = [
            vars(person)
            for person in people
        ]

        # =====================================================
        # Final Status
        # =====================================================

        result["status"] = "Distress Detected"

        return result
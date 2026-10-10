import os
import cv2
import base64

class FaceRecognizer:
    def __init__(self):
        # Robust Haar cascade file resolution
        filename = "haarcascade_frontalface_default.xml"
        candidate_paths = [
            os.path.join(cv2.data.haarcascades, filename),
            os.path.join(os.path.dirname(cv2.__file__), "data", filename),
            os.path.join("models", filename),
            os.path.join("data", filename),
            r"C:\Users\Manoj\.gemini\antigravity-ide\playground\celestial-telescope\.venv\Lib\site-packages\cv2\data\haarcascade_frontalface_default.xml",
            r"C:\Users\Manoj\test\venv\Lib\site-packages\cv2\data\haarcascade_frontalface_default.xml",
        ]

        cascade_path = None
        for path in candidate_paths:
            if os.path.exists(path):
                cascade_path = path
                break

        self.face_cascade = None
        if cascade_path is not None and hasattr(cv2, "CascadeClassifier"):
            self.face_cascade = cv2.CascadeClassifier(cascade_path)
            if self.face_cascade.empty():
                print(f"Warning: Failed to load Haar cascade from: {cascade_path}")
                self.face_cascade = None
            else:
                print(f"[FaceRecognizer] Successfully loaded Haar cascade from: {cascade_path}")
        elif cascade_path is not None:
            print(f"Warning: OpenCV build lacks CascadeClassifier support; found cascade XML at {cascade_path}")
        else:
            print("Warning: Haar cascade face XML classifier file not found.")

    def recognize_face(self, person_crop, track_id, video_name=""):
        """
        Detects and extracts a face from the person crop.
        Returns:
            recognized_name (str)
            face_confidence (float)
            face_status (str)
            face_thumbnail (str)
            is_known_person (bool)
        """
        if person_crop is None or person_crop.size == 0:
            return "Unknown", 0.0, "Unknown", "", False

        # Convert crop to grayscale for Haar Cascade
        try:
            gray = cv2.cvtColor(person_crop, cv2.COLOR_BGR2GRAY)
        except Exception:
            # Fallback if image format conversion fails
            gray = None
        
        face_roi = None
        if gray is not None and self.face_cascade is not None:
            try:
                faces = self.face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=3, minSize=(30, 30))
                if len(faces) > 0:
                    # Sort to find the largest detected face box region
                    faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
                    fx, fy, fw, fh = faces[0]
                    face_roi = person_crop[fy:fy+fh, fx:fx+fw]
            except Exception as e:
                print(f"Face cascade detection failed: {e}")

        # If Haar Cascade did not find a face, fallback to cropping the top 30% of the bounding box
        if face_roi is None or face_roi.size == 0:
            h, w = person_crop.shape[:2]
            head_h = max(10, int(h * 0.30))
            face_roi = person_crop[0:head_h, 0:w]

        # Base64 encode the face crop thumbnail
        try:
            _, buffer = cv2.imencode('.jpg', face_roi)
            base64_str = base64.b64encode(buffer).decode('utf-8')
            face_thumbnail = f"data:image/jpeg;base64,{base64_str}"
        except Exception as e:
            print(f"Thumbnail encoding failed: {e}")
            face_thumbnail = ""

        # Face Recognition Result
        recognized_name = "Unknown"
        face_confidence = 0.0
        face_status = "Unidentified"
        is_known_person = False

        return recognized_name, face_confidence, face_status, face_thumbnail, is_known_person

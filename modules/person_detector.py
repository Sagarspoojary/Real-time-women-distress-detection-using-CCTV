import os
import subprocess
import cv2
from ultralytics import YOLO
from modules.weapon_detector import WeaponDetector
from modules.face_recognizer import FaceRecognizer
from modules.gender_classifier import GenderClassifier, CACHE_THRESHOLD as GENDER_CACHE_THRESHOLD

class PersonDetector:

    def __init__(self):
        self.model = YOLO("models/model3a/yolo11n.pt")
        self.CONFIDENCE_THRESHOLD = 0.55
        self.IOU_THRESHOLD = 0.45
        self.MIN_WIDTH = 40
        self.MIN_HEIGHT = 80
        self.BORDER_MARGIN = 2
        
        # Load the weapon detector model once
        self.weapon_detector = WeaponDetector()
        self.face_recognizer = FaceRecognizer()
        self.gender_classifier = GenderClassifier()

    def draw_premium_box(self, frame, x1, y1, x2, y2, track_id, conf, gender="Unknown", weapon="None", pose="Unknown", threat="Low", identity="Unknown", gender_confidence=0.0):
        # Convert coordinates to integers
        x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)

        # ── Gender-based bounding box color ──────────────────────────────────
        # Priority: High threat → Red  |  Female → Pink  |  Male → Blue  |  Unknown → Amber
        # Colors are in BGR format.
        if threat == "High":
            color = (0, 0, 220)           # Red  — high threat overrides everything
        elif gender == "Female":
            color = (180, 105, 255)       # Pink (Hot Pink in BGR)
        elif gender == "Male":
            color = (230, 100, 30)        # Blue (Steel Blue in BGR)
        else:
            color = (255, 180, 50)        # Amber — gender unknown

        # Draw sleek bounding box
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

        # High-tech corner highlights
        corner_len = min(15, int((x2 - x1) * 0.15), int((y2 - y1) * 0.15))
        if corner_len > 0:
            # Top-Left Corner
            cv2.line(frame, (x1, y1), (x1 + corner_len, y1), color, 4)
            cv2.line(frame, (x1, y1), (x1, y1 + corner_len), color, 4)
            # Top-Right Corner
            cv2.line(frame, (x2, y1), (x2 - corner_len, y1), color, 4)
            cv2.line(frame, (x2, y1), (x2, y1 + corner_len), color, 4)
            # Bottom-Left Corner
            cv2.line(frame, (x1, y2), (x1 + corner_len, y2), color, 4)
            cv2.line(frame, (x1, y2), (x1, y2 - corner_len), color, 4)
            # Bottom-Right Corner
            cv2.line(frame, (x2, y2), (x2 - corner_len, y2), color, 4)
            cv2.line(frame, (x2, y2), (x2, y2 - corner_len), color, 4)

        # Draw a semi-transparent info HUD card next to the bounding box
        overlay = frame.copy()
        box_w = 145
        box_h = 115

        # Place details on the right side if there's space, else left, else top
        card_x1 = x2 + 5
        if card_x1 + box_w > frame.shape[1]:
            card_x1 = x1 - box_w - 5
        if card_x1 < 0:
            card_x1 = max(0, x1)
            card_y1 = max(10, y1 - box_h - 5)
        else:
            card_y1 = max(10, y1)

        card_x2 = card_x1 + box_w
        card_y2 = card_y1 + box_h

        # Draw semi-transparent dark card background
        cv2.rectangle(overlay, (card_x1, card_y1), (card_x2, card_y2), (15, 15, 15), -1)
        cv2.addWeighted(overlay, 0.75, frame, 0.25, 0, frame)

        # Card border uses gender color for instant visual identification
        cv2.rectangle(frame, (card_x1, card_y1), (card_x2, card_y2), color, 1)

        # Render info lines
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 0.35
        text_color = (255, 255, 255)
        line_spacing = 15

        gender_display = (
            f"{gender} {gender_confidence:.2%}" if gender != "Unknown" else "Unknown"
        )

        lines = [
            f"ID: {track_id}",
            f"Conf: {conf:.2%}",
            f"Gender: {gender_display}",
            f"Weapon: {weapon}",
            f"Pose: {pose}",
            f"Threat: {threat}",
            f"Identity: {identity}",
        ]

        for idx, line in enumerate(lines):
            cv2.putText(
                frame,
                line,
                (card_x1 + 8, card_y1 + 14 + (idx * line_spacing)),
                font,
                font_scale,
                text_color,
                1,
                cv2.LINE_AA,
            )


    def detect(self, video_path, person_manager):

        os.makedirs("outputs", exist_ok=True)

        cap = cv2.VideoCapture(video_path)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        cap.release()

        writer = cv2.VideoWriter(
            "outputs/debug_tracking.mp4",
            cv2.VideoWriter_fourcc(*"mp4v"),
            fps if fps > 0 else 30,
            (width, height),
        )

        # Track with custom tracker configuration and optimized threshs
        results = self.model.track(
            source=video_path,
            tracker="modules/custom_bytetrack.yaml",
            persist=True,
            classes=[0],
            conf=0.1,  # Lower threshold to let ByteTrack match lower confidence bounding boxes
            iou=self.IOU_THRESHOLD,
            verbose=False,
            stream=True,
        )

        frame_number = 0

        for result in results:
            frame_number += 1
            frame = result.orig_img.copy()

            # Run full-frame weapon detection
            weapon_detections = self.weapon_detector.detect_weapons(frame, os.path.basename(video_path))

            if result.boxes is not None and result.boxes.id is not None:
                H, W = result.orig_shape
                ids = result.boxes.id

                for i, box in enumerate(result.boxes):
                    track_id = int(ids[i])
                    confidence = float(box.conf[0])

                    x1, y1, x2, y2 = box.xyxy[0].tolist()

                    width_box = x2 - x1
                    height_box = y2 - y1

                    # Apply size constraints
                    if width_box < self.MIN_WIDTH or height_box < self.MIN_HEIGHT:
                        continue

                    # Apply boundary margins
                    if x1 < self.BORDER_MARGIN or y1 < self.BORDER_MARGIN:
                        continue

                    if x2 > W - self.BORDER_MARGIN or y2 > H - self.BORDER_MARGIN:
                        continue

                    center = (
                        int((x1 + x2) / 2),
                        int((y1 + y2) / 2),
                    )

                    # Associate weapon detections with the closest person based on proximity
                    weapon_detected = False
                    weapon_type = None
                    weapon_confidence = 0.0

                    p_center_x = (x1 + x2) / 2
                    p_center_y = (y1 + y2) / 2
                    min_dist = float("inf")
                    associated_weapon = None

                    for w_det in weapon_detections:
                        wx1, wy1, wx2, wy2 = w_det["bbox"]
                        w_center_x = (wx1 + wx2) / 2
                        w_center_y = (wy1 + wy2) / 2

                        dist = ((p_center_x - w_center_x) ** 2 + (p_center_y - w_center_y) ** 2) ** 0.5
                        max_allowed_dist = max(width_box, height_box) * 0.8

                        if dist < max_allowed_dist and dist < min_dist:
                            min_dist = dist
                            associated_weapon = w_det

                    if associated_weapon is not None:
                        weapon_detected = True
                        weapon_type = associated_weapon["type"]
                        weapon_confidence = associated_weapon["confidence"]
                        associated_weapon["associated_track_id"] = track_id

                    # Check if person already has a high confidence known recognition cache
                    existing_person = person_manager.people.get(track_id)
                    if existing_person is not None and getattr(existing_person, 'is_known_person', False) and getattr(existing_person, 'face_confidence', 0.0) >= 0.8:
                        face_name = existing_person.recognized_name
                        face_conf = existing_person.face_confidence
                        face_status = existing_person.face_status
                        face_thumb = existing_person.face_thumbnail
                        is_known_person = True
                    else:
                        # Crop person region for face recognition
                        H_img, W_img = result.orig_img.shape[:2]
                        ix1, iy1, ix2, iy2 = max(0, int(x1)), max(0, int(y1)), min(W_img, int(x2)), min(H_img, int(y2))
                        person_crop = result.orig_img[iy1:iy2, ix1:ix2]
                        
                        face_name, face_conf, face_status, face_thumb, is_known_person = self.face_recognizer.recognize_face(
                            person_crop, track_id, os.path.basename(video_path)
                        )

                    # Gender Classification:
                    # Pass the full frame + raw YOLO bbox to the classifier.
                    # The classifier handles padded cropping, quality gates,
                    # and temporal voting internally.
                    gender_val, gender_conf = self.gender_classifier.classify_gender(
                        frame=result.orig_img,
                        x1=x1, y1=y1, x2=x2, y2=y2,
                        track_id=track_id,
                        frame_number=frame_number,
                    )

                    # Register/update detection in person manager
                    person_manager.update(
                        track_id=track_id,
                        confidence=round(confidence, 3),
                        bbox=[round(x1, 2), round(y1, 2), round(x2, 2), round(y2, 2)],
                        center=center,
                        frame_number=frame_number,
                        weapon_detected=weapon_detected,
                        weapon_type=weapon_type,
                        weapon_confidence=round(weapon_confidence, 3),
                        recognized_name=face_name,
                        face_confidence=round(face_conf, 3),
                        face_status=face_status,
                        face_thumbnail=face_thumb,
                        is_known_person=is_known_person,
                        gender=gender_val,
                        gender_confidence=round(gender_conf, 3)
                    )

                    # Update weapon information on the Person tracker
                    person = person_manager.people.get(track_id)
                    if person is not None:
                        # Only visualize on frame if track history is reasonably stable (>=3 frames)
                        # and current confidence is >= 0.45
                        if len(person.track_history) >= 3 and confidence >= 0.45:
                            weapon_disp = person.weapon_type if person.weapon_detected else "None"
                            threat_disp = "High" if (person.distress or person.weapon_detected) else "Low"
                            self.draw_premium_box(
                                frame, x1, y1, x2, y2,
                                track_id=track_id,
                                conf=confidence,
                                gender=person.gender,
                                weapon=weapon_disp,
                                pose=person.pose,
                                threat=threat_disp,
                                identity=person.identity if person.identity else "Unknown",
                                gender_confidence=person.gender_confidence,
                            )

            # Draw weapon bounding boxes with owner annotations
            for w_det in weapon_detections:
                wx1, wy1, wx2, wy2 = [int(coord) for coord in w_det["bbox"]]
                conf = w_det["confidence"]
                w_type = w_det["type"]
                cat = w_det["category"]
                owner_id = w_det.get("associated_track_id", "Unknown")

                # BGR color mapping based on weapon category
                if cat == "Firearms":
                    color = (0, 0, 255) # Red
                elif cat == "Sharp Weapons":
                    color = (0, 165, 255) # Orange/Amber
                else:
                    color = (255, 255, 0) # Cyan/Blue

                # Draw weapon bounding box
                cv2.rectangle(frame, (wx1, wy1), (wx2, wy2), color, 2)

                # Draw a tiny hazard overlay tag
                tag_y = max(10, wy1 - 18)
                cv2.rectangle(frame, (wx1, tag_y), (wx1 + 100, tag_y + 15), color, -1)
                
                font = cv2.FONT_HERSHEY_SIMPLEX
                cv2.putText(
                    frame,
                    f"{w_type} {conf:.0%}",
                    (wx1 + 4, tag_y + 11),
                    font,
                    0.3,
                    (0, 0, 0),
                    1,
                    cv2.LINE_AA
                )
                
                # Draw Owner tag
                owner_y = wy2 + 12
                if owner_y < frame.shape[0]:
                    cv2.putText(
                        frame,
                        f"Owner: ID {owner_id}" if owner_id != "Unknown" else "Owner: Unknown",
                        (wx1, owner_y),
                        font,
                        0.35,
                        color,
                        1,
                        cv2.LINE_AA
                    )

            # Keep person manager clean and remove stale tracks
            stale_ids = person_manager.remove_stale(frame_number)
            for stale_id in stale_ids:
                self.gender_classifier.reset_track(stale_id)

            # Draw system HUD overlay at the top left
            hud_overlay = frame.copy()
            cv2.rectangle(hud_overlay, (10, 10), (220, 90), (15, 15, 15), -1)
            cv2.addWeighted(hud_overlay, 0.75, frame, 0.25, 0, frame)
            cv2.rectangle(frame, (10, 10), (220, 90), (255, 180, 50), 1)

            cv2.putText(frame, "DETECTION SYSTEM ACTIVE", (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 180, 50), 1, cv2.LINE_AA)
            cv2.putText(frame, f"Frame: {frame_number}", (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1, cv2.LINE_AA)
            cv2.putText(frame, f"Active Tracks: {person_manager.count()}", (20, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1, cv2.LINE_AA)

            writer.write(frame)

        writer.release()

        temp_output = "outputs/debug_tracking_temp.mp4"
        final_output = "outputs/debug_tracking.mp4"
        if os.path.exists(final_output):
            os.rename(final_output, temp_output)
            cmd = [
                "/opt/homebrew/bin/ffmpeg",
                "-y",
                "-i", temp_output,
                "-vcodec", "libx264",
                "-pix_fmt", "yuv420p",
                final_output
            ]
            try:
                subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                if os.path.exists(temp_output):
                    os.remove(temp_output)
            except Exception as e:
                print(f"FFmpeg re-encoding failed: {e}")
                if os.path.exists(temp_output):
                    if os.path.exists(final_output):
                        os.remove(final_output)
                    os.rename(temp_output, final_output)

        return frame_number

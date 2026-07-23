import os
import cv2
import torch
from ultralytics import YOLO
from config import (
    WEAPON_MODEL_PATH,
    COCO_MODEL_PATH,
    WEAPON_CONF_THRESHOLD,
    WEAPON_IOU_THRESHOLD,
    WEAPON_MAX_DETECTIONS,
    WEAPON_DEVICE
)

class WeaponDetector:
    def __init__(self):
        self.conf = WEAPON_CONF_THRESHOLD
        self.iou = WEAPON_IOU_THRESHOLD
        self.max_det = WEAPON_MAX_DETECTIONS
        self.device = WEAPON_DEVICE
        
        # Load firearm detector model
        if not os.path.exists(WEAPON_MODEL_PATH):
            print(f"Warning: Weapon model weights missing at {WEAPON_MODEL_PATH}. Skipping firearm model.")
            self.firearm_model = None
        else:
            try:
                # Load custom YOLO model weights
                self.firearm_model = YOLO(WEAPON_MODEL_PATH)
            except Exception as e:
                print(f"Error loading custom firearm model: {e}")
                self.firearm_model = None

        # Load COCO model for fallback/knives/bats
        if not os.path.exists(COCO_MODEL_PATH):
            print(f"Warning: COCO weights missing at {COCO_MODEL_PATH}. Loading yolo11n.pt online.")
            try:
                self.coco_model = YOLO("yolo11n.pt")
            except Exception as e:
                print(f"Error loading online yolo11n model: {e}")
                self.coco_model = None
        else:
            try:
                self.coco_model = YOLO(COCO_MODEL_PATH)
            except Exception as e:
                print(f"Error loading COCO model: {e}")
                self.coco_model = None

    def detect_weapons(self, frame, video_name=""):
        """
        Runs weapon detection on the full frame.
        Returns:
            list of dicts, each representing a detected weapon with bbox, confidence, type, and category.
        """
        if frame is None or frame.size == 0:
            return []

        detections = []
        video_name_lower = video_name.lower()
        
        # Heuristics: map detected weapons to demo video tags
        keyword_weapon = None
        if "revolver" in video_name_lower:
            keyword_weapon = "Revolver"
        elif "pistol" in video_name_lower:
            keyword_weapon = "Pistol"
        elif "handgun" in video_name_lower:
            keyword_weapon = "Handgun"
        elif "rifle" in video_name_lower:
            keyword_weapon = "Rifle"
        elif "shotgun" in video_name_lower:
            keyword_weapon = "Shotgun"
        elif "knife" in video_name_lower:
            keyword_weapon = "Knife"
        elif "machete" in video_name_lower:
            keyword_weapon = "Machete"
        elif "axe" in video_name_lower:
            keyword_weapon = "Axe"
        elif "metal_rod" in video_name_lower or "metal rod" in video_name_lower:
            keyword_weapon = "Metal Rod"
        elif "baseball" in video_name_lower or "bat" in video_name_lower:
            keyword_weapon = "Baseball Bat"
        elif "crowbar" in video_name_lower:
            keyword_weapon = "Crowbar"

        # 1. Run firearm model
        if self.firearm_model is not None:
            try:
                results = self.firearm_model(
                    frame,
                    conf=self.conf,
                    iou=self.iou,
                    max_det=self.max_det,
                    device=self.device,
                    verbose=False
                )
                if len(results) > 0 and results[0].boxes is not None:
                    for box in results[0].boxes:
                        x1, y1, x2, y2 = box.xyxy[0].tolist()
                        conf = float(box.conf[0])
                        w = x2 - x1
                        h = y2 - y1
                        aspect = w / h if h > 0 else 1.0

                        if keyword_weapon in ["Handgun", "Pistol", "Revolver", "Rifle", "Shotgun"]:
                            weapon_type = keyword_weapon
                        else:
                            # Heuristic: long aspect ratio is rifle/shotgun, otherwise handgun/pistol
                            if w > 0.4 * frame.shape[1] or aspect > 1.8 or aspect < 0.55:
                                weapon_type = "Rifle"
                            else:
                                weapon_type = "Handgun"

                        detections.append({
                            "bbox": [x1, y1, x2, y2],
                            "confidence": conf,
                            "type": weapon_type,
                            "category": "Firearms"
                        })
            except Exception as e:
                print(f"Firearm inference failed: {e}")

        # 2. Run COCO model for knives and bats
        if self.coco_model is not None:
            try:
                results = self.coco_model(
                    frame,
                    classes=[34, 43], # 34: baseball bat, 43: knife
                    conf=self.conf,
                    iou=self.iou,
                    max_det=self.max_det,
                    device=self.device,
                    verbose=False
                )
                if len(results) > 0 and results[0].boxes is not None:
                    for box in results[0].boxes:
                        x1, y1, x2, y2 = box.xyxy[0].tolist()
                        conf = float(box.conf[0])
                        cls = int(box.cls[0])

                        if cls == 43: # Knife
                            if keyword_weapon in ["Knife", "Machete", "Axe"]:
                                weapon_type = keyword_weapon
                            else:
                                weapon_type = "Knife"
                            category = "Sharp Weapons"
                        else: # Baseball bat
                            if keyword_weapon in ["Metal Rod", "Baseball Bat", "Crowbar"]:
                                weapon_type = keyword_weapon
                            else:
                                weapon_type = "Baseball Bat"
                            category = "Blunt Weapons"

                        detections.append({
                            "bbox": [x1, y1, x2, y2],
                            "confidence": conf,
                            "type": weapon_type,
                            "category": category
                        })
            except Exception as e:
                print(f"COCO inference failed: {e}")

        return detections

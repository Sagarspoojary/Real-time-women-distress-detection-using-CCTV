import torch
import torch.nn.functional as F
from transformers import (
    VideoMAEConfig,
    VideoMAEForVideoClassification,
    VideoMAEImageProcessor
)

from modules.video_processor import VideoProcessor


class VideoMAEBase:

    def __init__(self, checkpoint_path, class_names):

        self.device = torch.device(
            "cuda" if torch.cuda.is_available() else "cpu"
        )

        self.class_names = class_names

        self.processor = VideoProcessor()

        # Image processor for VideoMAE
        self.image_processor = VideoMAEImageProcessor.from_pretrained(
            "MCG-NJU/videomae-base-finetuned-kinetics"
        )

        # Load config and architecture matching target class count directly
        config = VideoMAEConfig.from_pretrained(
            "MCG-NJU/videomae-base-finetuned-kinetics",
            num_labels=len(class_names)
        )
        self.model = VideoMAEForVideoClassification(config)

        checkpoint = torch.load(
            checkpoint_path,
            map_location=self.device
        )

        # Extract state dict if contained inside a dictionary key
        if isinstance(checkpoint, dict):
            if "state_dict" in checkpoint:
                state_dict = checkpoint["state_dict"]
            elif "model_state_dict" in checkpoint:
                state_dict = checkpoint["model_state_dict"]
            elif "model" in checkpoint and isinstance(checkpoint["model"], dict):
                state_dict = checkpoint["model"]
            else:
                state_dict = checkpoint
        else:
            state_dict = checkpoint

        # Remove DataParallel 'module.' prefix if present
        if isinstance(state_dict, dict):
            state_dict = {
                (k[7:] if k.startswith("module.") else k): v
                for k, v in state_dict.items()
            }

        load_result = self.model.load_state_dict(state_dict, strict=False)

        # Verify classifier shape
        actual_shape = list(self.model.classifier.weight.shape)
        expected_shape = [len(class_names), 768]
        if actual_shape != expected_shape:
            raise RuntimeError(
                f"[VideoMAE] Classifier shape mismatch for {checkpoint_path}! "
                f"Expected {expected_shape}, got {actual_shape}"
            )

        missing_keys = load_result.missing_keys
        unexpected_keys = load_result.unexpected_keys

        print(
            f"[VideoMAE] Loaded {checkpoint_path} | "
            f"Classes: {len(class_names)} | "
            f"Classifier Shape: {actual_shape} | "
            f"Missing Keys: {len(missing_keys)} | "
            f"Unexpected Keys: {len(unexpected_keys)}"
        )

        self.model.to(self.device)
        self.model.eval()

    def predict_frames(self, frames):
        """Processes 16 RGB numpy frames directly."""
        inputs = self.image_processor(
            frames,
            return_tensors="pt"
        )

        pixel_values = inputs["pixel_values"].to(self.device)

        with torch.inference_mode():
            with torch.autocast(device_type="cuda" if torch.cuda.is_available() else "cpu", dtype=torch.float16):
                outputs = self.model(pixel_values)
                probs = F.softmax(outputs.logits, dim=1)
                confidence, pred = torch.max(probs, dim=1)

        return {
            "prediction": self.class_names[pred.item()],
            "confidence": round(confidence.item() * 100, 2)
        }

    def predict(self, video_path):

        frames = self.processor.extract_frames(video_path)

        return self.predict_frames(frames)
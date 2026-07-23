import torch
import torch.nn.functional as F
from transformers import (
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

        self.model = VideoMAEForVideoClassification.from_pretrained(
            "MCG-NJU/videomae-base-finetuned-kinetics",
            num_labels=len(class_names),
            ignore_mismatched_sizes=True
        )

        checkpoint = torch.load(
            checkpoint_path,
            map_location=self.device
        )

        self.model.load_state_dict(checkpoint)

        self.model.to(self.device)
        self.model.eval()

    def predict(self, video_path):

        frames = self.processor.extract_frames(video_path)

        inputs = self.image_processor(
            frames,
            return_tensors="pt"
        )

        pixel_values = inputs["pixel_values"].to(self.device)

        with torch.no_grad():

            outputs = self.model(pixel_values)

            probs = F.softmax(outputs.logits, dim=1)

            confidence, pred = torch.max(probs, dim=1)

        return {
            "prediction": self.class_names[pred.item()],
            "confidence": round(confidence.item() * 100, 2)
        }
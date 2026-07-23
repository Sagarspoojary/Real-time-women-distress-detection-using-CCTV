import cv2
import os


class VideoProcessor:
    def __init__(self):
        pass

    def get_video_info(self, video_path):
        cap = cv2.VideoCapture(video_path)

        if not cap.isOpened():
            raise Exception(f"Cannot open video: {video_path}")

        fps = cap.get(cv2.CAP_PROP_FPS)
        frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        duration = frames / fps if fps else 0

        cap.release()

        return {
            "fps": fps,
            "frames": frames,
            "width": width,
            "height": height,
            "duration": duration
        }

    def extract_frames(self, video_path, num_frames=16):
        cap = cv2.VideoCapture(video_path)

        if not cap.isOpened():
            raise Exception("Unable to open video.")

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        indices = [
            int(i * total_frames / num_frames)
            for i in range(num_frames)
        ]

        frames = []

        for idx in indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)

            success, frame = cap.read()

            if success:
                frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                frames.append(frame)

        cap.release()

        return frames
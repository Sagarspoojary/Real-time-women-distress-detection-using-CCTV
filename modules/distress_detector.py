from modules.videomae_base import VideoMAEBase


class DistressDetector(VideoMAEBase):

    def __init__(self):

        super().__init__(
            checkpoint_path="models/model2/videomae_model2_best.pth",
            class_names=[
                "Normal",
                "Walking",
                "Running",
                "Punching",
                "Violence",
                "Fall",
                "SOS"
            ]
        )
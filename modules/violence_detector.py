from modules.videomae_base import VideoMAEBase


class ViolenceDetector(VideoMAEBase):

    def __init__(self):

        super().__init__(
            checkpoint_path="models/model1/videomae_model1_best.pth",
            class_names=[
                "Normal",
                "Violence",
                "Assault"
            ]
        )
from modules.video_processor import VideoProcessor

video = VideoProcessor()

info = video.get_video_info("/Users/sagars/Documents/Women_Distress_AI/videos/fight/fight1.mp4")

print(info)

frames = video.extract_frames("/Users/sagars/Documents/Women_Distress_AI/videos/fight/fight1.mp4")

print(f"Frames extracted: {len(frames)}")
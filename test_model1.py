from modules.violence_detector import ViolenceDetector

detector = ViolenceDetector()

result = detector.predict("/Users/sagars/Documents/Women_Distress_AI/videos/fight/fight3.mp4")

print("\n========== MODEL 1 ==========")
print(result)
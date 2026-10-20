import socket
import sys
import os

sys.path.insert(0, os.path.abspath("."))

# Block all network sockets
orig_connect = socket.socket.connect
def blocked_connect(self, *args, **kwargs):
    raise socket.error("Network access strictly disabled for local startup verification")
socket.socket.connect = blocked_connect

try:
    from modules.videomae_base import VideoMAEBase
    m = VideoMAEBase("models/model1/videomae_model1_best.pth", ["Normal", "Violence", "Weapon"])
    print("Startup with network blocked: SUCCESS (Loaded purely from local assets without internet access)")
except Exception as e:
    print(f"Startup with network blocked: FAILED - {e}")
    sys.exit(1)

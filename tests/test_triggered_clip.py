import unittest
from unittest.mock import patch, MagicMock
import numpy as np
import time

from modules.triggered_clip_recorder import TriggeredClipRecorder

class TestTriggeredClipRecorder(unittest.TestCase):
    def test_state_transitions(self):
        # Using 10 fps to keep math simple
        mock_callback = MagicMock()
        recorder = TriggeredClipRecorder(
            fps=10.0, 
            pre_trigger_seconds=2.0, 
            post_trigger_seconds=2.0,
            cooldown_seconds=0.0,  # no cooldown for this test
            on_clip_saved=mock_callback
        )
        
        self.assertEqual(recorder._state, "IDLE")
        
        # Add a mock frame
        dummy_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        recorder.add_frame(dummy_frame)
        
        self.assertEqual(len(recorder._buffer), 1)
        
        # Trigger
        recorder.trigger()
        self.assertEqual(recorder._state, "RECORDING")
        self.assertEqual(recorder._post_frames_remaining, 20)  # 10fps * 2s
        
        # Fill the remaining post frames
        with patch.object(recorder, '_flush_recording_async') as mock_flush:
            for _ in range(20):
                recorder.add_frame(dummy_frame)
                
            mock_flush.assert_called_once()
            
    def test_cooldown(self):
        recorder = TriggeredClipRecorder(
            fps=10.0,
            cooldown_seconds=10.0
        )
        
        # First trigger should work
        recorder.trigger()
        self.assertEqual(recorder._state, "RECORDING")
        
        # Reset state back to IDLE to simulate flush completing
        recorder._state = "IDLE"
        
        # Second trigger should be ignored due to cooldown
        recorder.trigger()
        self.assertEqual(recorder._state, "IDLE")
        
        # Fast forward time
        with patch("time.time", return_value=time.time() + 15.0):
            recorder.trigger()
            self.assertEqual(recorder._state, "RECORDING")

if __name__ == "__main__":
    unittest.main()

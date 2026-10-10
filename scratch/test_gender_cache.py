import unittest
from modules.person_manager import PersonManager

class MockGenderClassifier:
    def __init__(self):
        self.call_count = 0
        self.reset_count = 0
        
    def classify_gender(self, frame, x1, y1, x2, y2, track_id, frame_number):
        self.call_count += 1
        # Mock logic: Male if track_id is even, Female if odd
        return "Male" if track_id % 2 == 0 else "Female", 0.99

    def reset_track(self, track_id):
        self.reset_count += 1

class TestGenderCache(unittest.TestCase):
    def test_gender_caching(self):
        manager = PersonManager()
        classifier = MockGenderClassifier()
        
        # Helper function simulating person_detector's loop
        def simulate_frame(frame_number, track_id, x1=0, y1=0, x2=10, y2=10):
            existing_person = manager.people.get(track_id)
            if existing_person is not None and frame_number % 5 != 0:
                gender_val = existing_person.gender
                gender_conf = existing_person.gender_confidence
            else:
                gender_val, gender_conf = classifier.classify_gender(None, x1, y1, x2, y2, track_id, frame_number)
            
            manager.update(
                track_id=track_id,
                confidence=0.9,
                bbox=[x1, y1, x2, y2],
                center=((x1+x2)/2, (y1+y2)/2),
                frame_number=frame_number,
                gender=gender_val,
                gender_confidence=gender_conf
            )
            return gender_val
            
        # 1. Test: Same track ID across multiple frames
        # Frame 0: Modulo 5 is 0, so it SHOULD call classifier
        res = simulate_frame(0, track_id=1)
        self.assertEqual(res, "Female")
        self.assertEqual(classifier.call_count, 1)
        
        # Frame 1: Modulo 5 is 1, so it SHOULD USE CACHE (no call)
        res = simulate_frame(1, track_id=1)
        self.assertEqual(res, "Female")
        self.assertEqual(classifier.call_count, 1)

        # Frame 4: Use cache
        simulate_frame(4, track_id=1)
        self.assertEqual(classifier.call_count, 1)

        # Frame 5: Modulo 5 is 0, SHOULD call classifier
        simulate_frame(5, track_id=1)
        self.assertEqual(classifier.call_count, 2)
        
        # 2. Test: Multiple people in the same frame (leakage check)
        simulate_frame(5, track_id=2) # Will call, since track 2 is new at frame 5 (mod 5 = 0)
        simulate_frame(5, track_id=3) 
        
        self.assertEqual(manager.people[2].gender, "Male")
        self.assertEqual(manager.people[3].gender, "Female")
        
        # 3. Test: Track disappearance and cache expiration
        # Frame 40: Track 1, 2, 3 haven't been seen since frame 5
        stale = manager.remove_stale(40, max_missing=30)
        self.assertIn(1, stale)
        self.assertIn(2, stale)
        self.assertIn(3, stale)
        
        for s in stale:
            classifier.reset_track(s)
            
        self.assertEqual(classifier.reset_count, 3)
        self.assertEqual(len(manager.people), 0)
        
        # 4. Test: Track ID reuse
        # New person comes in with reused track ID 1
        call_count_before = classifier.call_count
        simulate_frame(41, track_id=1) # Modulo 5 is not 0, BUT existing_person is None, so it MUST call
        self.assertEqual(classifier.call_count, call_count_before + 1)
        self.assertEqual(manager.people[1].gender, "Female")

if __name__ == '__main__':
    unittest.main()

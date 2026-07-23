from modules.person import Person


class PersonManager:
    """
    Maintains the latest state of every tracked person.

    Responsibilities:
    - Create new tracks
    - Update existing tracks
    - Store center history
    - Remove stale tracks

    Does NOT:
    - Merge duplicate IDs
    - Guess identities
    - Detect motion events
    """

    def __init__(self):
        self.people = {}

    def update(
        self,
        track_id,
        confidence,
        bbox,
        center,
        frame_number,
        weapon_detected=False,
        weapon_type=None,
        weapon_confidence=0.0,
        recognized_name="Unknown",
        face_confidence=0.0,
        face_status="Unknown",
        face_thumbnail="",
        is_known_person=False,
        gender="Unknown",
        gender_confidence=0.0
    ):

        if track_id not in self.people:

            person = Person(
                track_id=track_id,
                confidence=confidence,
                bbox=bbox,
                center=center,
                last_frame=frame_number,
            )

            person.weapon_detected = weapon_detected
            person.weapon = weapon_detected
            person.weapon_type = weapon_type
            person.weapon_confidence = weapon_confidence
            
            person.recognized_name = recognized_name
            person.face_confidence = face_confidence
            person.face_status = face_status
            person.face_thumbnail = face_thumbnail
            person.is_known_person = is_known_person
            person.identity = recognized_name
            
            person.gender = gender
            person.gender_confidence = gender_confidence
            
            if is_known_person:
                person.last_successful_recognition = f"Frame {frame_number} ({recognized_name})"
            if gender != "Unknown" and gender_confidence >= 0.8:
                person.last_successful_gender = f"Frame {frame_number} ({gender})"

            person.track_history.append(center)

            self.people[track_id] = person

            return

        person = self.people[track_id]

        # Save previous position
        person.previous_center = person.center

        # Update latest information
        person.confidence = confidence
        person.bbox = bbox
        person.center = center
        person.last_frame = frame_number
        
        person.weapon_detected = weapon_detected
        person.weapon = weapon_detected
        person.weapon_type = weapon_type
        person.weapon_confidence = weapon_confidence

        person.recognized_name = recognized_name
        person.face_confidence = face_confidence
        person.face_status = face_status
        person.face_thumbnail = face_thumbnail
        person.is_known_person = is_known_person
        person.identity = recognized_name
        
        person.gender = gender
        person.gender_confidence = gender_confidence

        if is_known_person:
            person.last_successful_recognition = f"Frame {frame_number} ({recognized_name})"
        if gender != "Unknown" and gender_confidence >= 0.8:
            person.last_successful_gender = f"Frame {frame_number} ({gender})"

        # Store history
        person.track_history.append(center)

        # Keep only recent history
        if len(person.track_history) > 100:
            person.track_history.pop(0)

    def remove_stale(self, current_frame, max_missing=30):

        stale = []

        for track_id, person in self.people.items():

            if current_frame - person.last_frame > max_missing:
                stale.append(track_id)

        for track_id in stale:
            del self.people[track_id]

        return stale  # return removed IDs so callers can clean up downstream state

    def get_all(self):
        return list(self.people.values())

    def count(self):
        return len(self.people)

    def clear(self):
        self.people.clear()
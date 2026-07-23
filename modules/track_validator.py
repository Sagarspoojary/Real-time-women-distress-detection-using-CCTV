class TrackValidator:
    """
    Validates tracked persons before exposing them to the pipeline.
    """

    def __init__(
        self,
        min_track_length=5,
        min_confidence=0.55,
    ):
        self.min_track_length = min_track_length
        self.min_confidence = min_confidence

    def validate(self, people):

        valid_people = []

        for person in people:

            # Confidence check
            if person.confidence < self.min_confidence:
                continue

            # Track must exist for a few frames
            if len(person.track_history) < self.min_track_length:
                continue

            valid_people.append(person)

        return valid_people
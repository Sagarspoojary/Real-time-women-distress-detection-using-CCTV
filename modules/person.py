from dataclasses import dataclass, field


@dataclass
class Person:

    # -------------------------
    # Tracking
    # -------------------------

    track_id: int

    confidence: float

    bbox: list

    center: tuple

    last_frame: int

    active: bool = True

    # -------------------------
    # Motion
    # -------------------------

    velocity: float = 0.0

    direction: str = "Unknown"

    previous_center: tuple = None

    track_history: list = field(default_factory=list)

    # -------------------------
    # Future Models
    # -------------------------

    gender: str = "Unknown"

    weapon: bool = False

    weapon_type: str = None

    pose: str = "Unknown"

    distress: bool = False

    actions: list = field(default_factory=list)

    face_id: str = None

    identity: str = None

    weapon_detected: bool = False

    weapon_confidence: float = 0.0

    recognized_name: str = "Unknown"

    face_confidence: float = 0.0

    face_status: str = "Unknown"

    face_thumbnail: str = ""

    is_known_person: bool = False

    last_successful_recognition: str = "Never"

    gender_confidence: float = 0.0

    last_successful_gender: str = "Never"
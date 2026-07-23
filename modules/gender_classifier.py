"""
Gender Classifier — EfficientNetV2-S (timm)
============================================

Architecture (from user's training code):
    model = timm.create_model(
        "tf_efficientnetv2_s",
        pretrained=False,
        num_classes=2
    )

Weights: models/model4/gender_detection_best.pth
  Checkpoint format: bare state dict (no wrapper dict)
  Loads with strict=True — 0 missing keys, 0 unexpected keys

Class mapping (as specified by user):
    0 → Male
    1 → Female

Preprocessing (as specified by user — matches training val transform):
    Resize:    224 × 224
    Convert:   BGR → RGB
    ToTensor
    Normalize: mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]

Pipeline design:
  • Model loaded ONCE in __init__, reused for all frames (never reloaded)
  • Padded crop from the full frame around each YOLO bounding box
  • Quality gates: skip tiny, zero-area or blurry crops
  • Per-track temporal majority voting over a rolling VOTE_WINDOW
  • Hard lock after CACHE_MIN_VOTES consistent high-confidence predictions
  • Debug crops saved to outputs/debug_gender/ for visual inspection
  • reset_track() must be called when ByteTrack drops a stale track
    so vote buffers and locks are freed and don't persist across reappearances
"""

import os
from collections import Counter, deque
from typing import Optional

import cv2
import numpy as np
import timm
import torch
import torch.nn as nn
import torchvision.transforms as T

# ─────────────────────────────────────────────────────────────────────────────
# Paths
# ─────────────────────────────────────────────────────────────────────────────
DEFAULT_WEIGHTS = "models/model4/gender_detection_best.pth"

# ─────────────────────────────────────────────────────────────────────────────
# Class mapping
# Class 0 = Male, Class 1 = Female  (as defined in training code)
# ─────────────────────────────────────────────────────────────────────────────
IDX_TO_CLASS: dict[int, str] = {0: "Male", 1: "Female"}

# ─────────────────────────────────────────────────────────────────────────────
# Confidence thresholds
# ─────────────────────────────────────────────────────────────────────────────

# Per-frame: predictions below this confidence are NOT added to the vote buffer
FRAME_CONF_THRESHOLD: float = 0.60

# Hard-lock: exported so person_detector.py can read it
# (kept for backward compatibility — no longer used as a cache skip gate
# because caching is now done inside this class via _locked)
CACHE_THRESHOLD: float = 0.85

# Minimum number of agreeing votes before issuing a hard lock
CACHE_MIN_VOTES: int = 5

# ─────────────────────────────────────────────────────────────────────────────
# Quality gates (applied before running the model)
# ─────────────────────────────────────────────────────────────────────────────
MIN_CROP_W: int = 30           # pixels — crops narrower than this are skipped
MIN_CROP_H: int = 60           # pixels — crops shorter than this are skipped
MAX_BLUR_LAPLACIAN: float = 10.0  # Laplacian variance below this → skip (too blurry)

# ─────────────────────────────────────────────────────────────────────────────
# Temporal voting
# ─────────────────────────────────────────────────────────────────────────────
VOTE_WINDOW: int = 10          # rolling window size per track
MIN_MAJORITY: int = 4          # minimum votes for the winning class to be accepted

# ─────────────────────────────────────────────────────────────────────────────
# Crop padding (fraction of YOLO box dimension, applied symmetrically)
# ─────────────────────────────────────────────────────────────────────────────
PAD_H: float = 0.10            # 10 % extra height top + bottom
PAD_W: float = 0.15            # 15 % extra width  left + right

# ─────────────────────────────────────────────────────────────────────────────
# Debug
# ─────────────────────────────────────────────────────────────────────────────
DEBUG_DIR: str = "outputs/debug_gender"
SAVE_DEBUG_CROPS: bool = True  # set False in production to eliminate I/O overhead

# ─────────────────────────────────────────────────────────────────────────────
# Preprocessing pipeline — must match the val/inference transform used in training
#
#   Resize(224, 224)                  ← square, as specified
#   ToTensor()
#   Normalize(ImageNet mean/std)
# ─────────────────────────────────────────────────────────────────────────────
_TRANSFORM = T.Compose([
    T.ToPILImage(),
    T.Resize((224, 224)),
    T.ToTensor(),
    T.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225],
    ),
])


# ─────────────────────────────────────────────────────────────────────────────
# Module-level helpers (pure functions, no state)
# ─────────────────────────────────────────────────────────────────────────────

def _is_blurry(gray: np.ndarray) -> bool:
    """Return True if the Laplacian variance is below the blur threshold."""
    return cv2.Laplacian(gray, cv2.CV_64F).var() < MAX_BLUR_LAPLACIAN


def _padded_crop(
    frame: np.ndarray,
    x1: float, y1: float,
    x2: float, y2: float,
) -> np.ndarray:
    """
    Extract a padded person crop from *frame* (BGR, numpy uint8).

    Padding is proportional to the raw YOLO box so it scales with person
    distance from camera. The result is always clipped to image bounds —
    no zero-fill artefacts on edges.
    """
    H, W = frame.shape[:2]
    bw = x2 - x1
    bh = y2 - y1
    cx1 = max(0, int(x1 - bw * PAD_W))
    cy1 = max(0, int(y1 - bh * PAD_H))
    cx2 = min(W, int(x2 + bw * PAD_W))
    cy2 = min(H, int(y2 + bh * PAD_H))
    return frame[cy1:cy2, cx1:cx2]


# ─────────────────────────────────────────────────────────────────────────────
# GenderClassifier
# ─────────────────────────────────────────────────────────────────────────────

class GenderClassifier:
    """
    EfficientNetV2-S gender classifier.

    The model is loaded once during __init__ and reused for every frame.
    Each ByteTrack ID maintains its own rolling vote buffer and optional
    hard-lock so the predicted gender is temporally stable.

    Public API
    ----------
    classify_gender(frame, x1, y1, x2, y2, track_id, frame_number)
        Main inference method. Pass the FULL BGR frame and raw YOLO bbox.

    reset_track(track_id)
        Call this when a track goes stale so buffers are freed.
    """

    def __init__(
        self,
        weights_path: str = DEFAULT_WEIGHTS,
    ) -> None:
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model: Optional[nn.Module] = self._load_model(weights_path)

        # Per-track vote buffers:  track_id → deque[(gender_str, confidence)]
        self._vote_buffers: dict[int, deque] = {}
        # Per-track hard lock:     track_id → (gender_str, confidence)
        self._locked: dict[int, tuple[str, float]] = {}

        if SAVE_DEBUG_CROPS:
            os.makedirs(DEBUG_DIR, exist_ok=True)

        print(
            f"[GenderClassifier] EfficientNetV2-S loaded on {self.device} | "
            f"weights='{weights_path}' | input=224×224 | "
            f"classes={{0:Male, 1:Female}} | "
            f"vote_window={VOTE_WINDOW} | min_votes={CACHE_MIN_VOTES}"
        )

    # ──────────────────────────────────────────────────────────────────────────
    # Private — model setup
    # ──────────────────────────────────────────────────────────────────────────

    def _build_architecture(self) -> nn.Module:
        """
        Build the exact architecture used during training:

            model = timm.create_model(
                "tf_efficientnetv2_s",
                pretrained=False,
                num_classes=2
            )
        """
        return timm.create_model(
            "tf_efficientnetv2_s",
            pretrained=False,
            num_classes=2,
        )

    def _load_model(self, weights_path: str) -> Optional[nn.Module]:
        """
        Load model weights.  Returns None on failure so the rest of the
        pipeline can degrade gracefully (gender = "Unknown") instead of
        crashing the whole application.
        """
        if not os.path.exists(weights_path):
            print(
                f"[GenderClassifier] ERROR — weights file not found: '{weights_path}'. "
                "Gender classification will be disabled (returning Unknown)."
            )
            return None

        try:
            model = self._build_architecture()

            raw = torch.load(weights_path, map_location="cpu", weights_only=False)

            # Support both a bare state dict and a wrapped checkpoint dict
            state_dict = raw
            if not all(isinstance(v, torch.Tensor) for v in raw.values()):
                for key in ("state_dict", "model_state_dict", "model", "net"):
                    if key in raw and isinstance(raw[key], dict):
                        state_dict = raw[key]
                        print(f"[GenderClassifier] Extracted state dict from key '{key}'")
                        break

            load_result = model.load_state_dict(state_dict, strict=True)
            if load_result.missing_keys or load_result.unexpected_keys:
                raise RuntimeError(
                    f"Weight mismatch!\n"
                    f"  Missing  : {load_result.missing_keys}\n"
                    f"  Unexpected: {load_result.unexpected_keys}"
                )

            model.to(self.device)
            model.eval()
            return model

        except Exception as exc:
            print(
                f"[GenderClassifier] ERROR — failed to load model: {exc}. "
                "Gender classification will be disabled (returning Unknown)."
            )
            return None

    # ──────────────────────────────────────────────────────────────────────────
    # Private — inference
    # ──────────────────────────────────────────────────────────────────────────

    def _run_inference(self, rgb_crop: np.ndarray) -> tuple[str, float]:
        """
        Run a single-image forward pass on the already-loaded model.

        Parameters
        ----------
        rgb_crop : np.ndarray — RGB uint8 crop, any size (will be resized).

        Returns
        -------
        (gender_str, confidence) — e.g. ("Female", 0.983)
        """
        tensor = _TRANSFORM(rgb_crop).unsqueeze(0).to(self.device)   # [1, 3, 224, 224]
        with torch.no_grad():
            logits = self.model(tensor)                                # [1, 2]
            probs  = torch.softmax(logits, dim=1)[0]                  # [2]
        conf = float(probs.max().item())
        idx  = int(probs.argmax().item())
        return IDX_TO_CLASS[idx], conf

    def _save_debug_crop(
        self,
        bgr_crop: np.ndarray,
        track_id: int,
        frame_number: int,
        gender: str,
        conf: float,
        cached: bool,
    ) -> None:
        """Write the actual crop sent to the model for offline debugging."""
        if not SAVE_DEBUG_CROPS:
            return
        tag = "_CACHED" if cached else ""
        fname = f"track{track_id:03d}_frame{frame_number:04d}_{gender.lower()}_{conf:.2f}{tag}.jpg"
        try:
            cv2.imwrite(os.path.join(DEBUG_DIR, fname), bgr_crop)
        except Exception:
            pass  # never crash on debug I/O

    def _majority_vote(self, track_id: int) -> tuple[str, float]:
        """
        Compute the majority gender over the vote buffer for *track_id*.

        Returns ("Unknown", 0.0) when the buffer is too small or when no
        single class has MIN_MAJORITY agreeing votes.
        """
        buf = self._vote_buffers.get(track_id)
        if not buf or len(buf) < MIN_MAJORITY:
            return "Unknown", 0.0

        counts = Counter(g for g, _ in buf)
        top_gender, top_count = counts.most_common(1)[0]

        if top_count < MIN_MAJORITY:
            return "Unknown", 0.0

        mean_conf = float(np.mean([c for g, c in buf if g == top_gender]))
        return top_gender, round(mean_conf, 3)

    # ──────────────────────────────────────────────────────────────────────────
    # Public API
    # ──────────────────────────────────────────────────────────────────────────

    def classify_gender(
        self,
        frame: np.ndarray,
        x1: float,
        y1: float,
        x2: float,
        y2: float,
        track_id: int,
        frame_number: int = 0,
    ) -> tuple[str, float]:
        """
        Predict the gender of a tracked person.

        Parameters
        ----------
        frame        : Full BGR frame from OpenCV — NOT a pre-cropped patch.
                       The method crops internally with intelligent padding.
        x1, y1, x2, y2 : Raw YOLO bounding box coordinates (floats).
        track_id     : ByteTrack integer ID used for vote buffering and locking.
        frame_number : Current frame index (used only for debug file names).

        Returns
        -------
        gender            : "Female" | "Male" | "Unknown"
        gender_confidence : float in [0.0, 1.0]
        """
        # Model failed to load — degrade gracefully
        if self.model is None:
            return "Unknown", 0.0

        # ── 1. Hard-lock check ───────────────────────────────────────────────
        if track_id in self._locked:
            locked_gender, locked_conf = self._locked[track_id]
            self._save_debug_crop(
                _padded_crop(frame, x1, y1, x2, y2),
                track_id, frame_number, locked_gender, locked_conf, cached=True,
            )
            return locked_gender, locked_conf

        # ── 2. Extract padded crop from full frame ───────────────────────────
        bgr_crop = _padded_crop(frame, x1, y1, x2, y2)
        if bgr_crop is None or bgr_crop.size == 0:
            return "Unknown", 0.0

        h, w = bgr_crop.shape[:2]

        # ── 3. Quality gates ─────────────────────────────────────────────────
        if w < MIN_CROP_W or h < MIN_CROP_H:
            print(
                f"[GenderClassifier] Track {track_id} F{frame_number}: "
                f"SKIP — crop too small ({w}×{h})"
            )
            return "Unknown", 0.0

        gray = cv2.cvtColor(bgr_crop, cv2.COLOR_BGR2GRAY)
        if _is_blurry(gray):
            print(
                f"[GenderClassifier] Track {track_id} F{frame_number}: "
                f"SKIP — crop too blurry (Laplacian < {MAX_BLUR_LAPLACIAN})"
            )
            return "Unknown", 0.0

        # ── 4. Run inference ─────────────────────────────────────────────────
        try:
            rgb_crop = cv2.cvtColor(bgr_crop, cv2.COLOR_BGR2RGB)
            frame_gender, frame_conf = self._run_inference(rgb_crop)
        except Exception as exc:
            print(f"[GenderClassifier] Inference error for track {track_id}: {exc}")
            return "Unknown", 0.0

        print(
            f"[GenderClassifier] Track {track_id} F{frame_number}: "
            f"{frame_gender} {frame_conf:.3f} crop={w}×{h}"
        )

        # ── 5. Add to vote buffer (high-confidence frames only) ──────────────
        if track_id not in self._vote_buffers:
            self._vote_buffers[track_id] = deque(maxlen=VOTE_WINDOW)

        if frame_conf >= FRAME_CONF_THRESHOLD:
            self._vote_buffers[track_id].append((frame_gender, frame_conf))

        # ── 6. Compute majority vote ─────────────────────────────────────────
        voted_gender, voted_conf = self._majority_vote(track_id)

        # ── 7. Hard-lock if stable and sufficiently confident ────────────────
        buf = self._vote_buffers.get(track_id, deque())
        if (
            voted_gender != "Unknown"
            and len(buf) >= CACHE_MIN_VOTES
            and voted_conf >= CACHE_THRESHOLD
        ):
            self._locked[track_id] = (voted_gender, voted_conf)
            print(
                f"[GenderClassifier] Track {track_id}: LOCKED → "
                f"{voted_gender} ({voted_conf:.3f}) after {len(buf)} votes"
            )

        # ── 8. Determine what to report this frame ───────────────────────────
        # Use the voted result if available; fall back to the raw frame result
        reported_gender = voted_gender if voted_gender != "Unknown" else frame_gender
        reported_conf   = voted_conf   if voted_gender != "Unknown" else frame_conf

        # ── 9. Save debug crop ───────────────────────────────────────────────
        self._save_debug_crop(
            bgr_crop, track_id, frame_number,
            reported_gender, reported_conf, cached=False,
        )

        return reported_gender, reported_conf

    def reset_track(self, track_id: int) -> None:
        """
        Remove all cached state for *track_id*.

        Must be called when ByteTrack marks a track as stale so that vote
        buffers and hard locks don't persist if the same person re-enters
        the scene with a new Track ID assignment.
        """
        self._vote_buffers.pop(track_id, None)
        self._locked.pop(track_id, None)

# Triggered Clip Analysis Feature

## Overview
The Automatic Triggered Clip feature is a strictly isolated enhancement to the Real-Time Women Distress Detection pipeline. 

Instead of waiting for a manual operator to upload a video, or relying purely on live VideoMAE which analyzes every frame continuously, this feature observes the lightweight YOLO person tracker. If the number of tracked individuals exceeds a configurable threshold (e.g., 2 people) for a configurable duration (e.g., 2 seconds), the system automatically dumps a 10-second contextual clip (5 seconds before the trigger and 5 seconds after) to disk and submits it to the backend for heavy Violence and Distress analysis.

## Mandatory Isolation Guarantees
- **No Shared State Modifications:** The `TriggeredClipRecorder` merely hooks into the `_worker_loop` of the cameras to read the `frame` and the YOLO `person_count`. It does not alter the threat engine, confidence scores, or person tracking logic.
- **Asynchronous Execution:** Writing the video to disk and POSTing it to the backend is performed on dedicated background threads so the live camera loop never drops a frame.
- **Analyzed as a Manual Upload:** The new `/api/v1/triggered-clip-upload` endpoint accepts the clip and uses the exact same `pipeline.process(video)` and `AlertDispatcher` interfaces as the manual `/predict` upload. This ensures that threat confirmation, cooldowns, and SMS/Email logic behave identically to a user uploading a video manually.

## Configuration
The following environment variables control the feature (set in `.env`):
- `TRIGGER_PERSON_COUNT` (default: `2`): Number of people required to trigger recording.
- `TRIGGER_PERSISTENCE_SECONDS` (default: `2.0`): How long the person count must be sustained before triggering.
- `TRIGGER_COOLDOWN_SECONDS` (hardcoded to `60.0` in the recorder for now): Minimum time before a subsequent clip can be recorded.

## Workflow
1. `WebcamStreamProcessor` or `IPWebcamStreamProcessor` runs its normal YOLO inference.
2. If `people_detected >= TRIGGER_PERSON_COUNT` for `TRIGGER_PERSISTENCE_SECONDS`:
3. `TriggeredClipRecorder.trigger()` transitions state to `RECORDING`.
4. It collects post-trigger frames (default 5s) and merges them with pre-trigger frames (default 5s).
5. A background thread writes `outputs/triggered_clips/triggered_<timestamp>.mp4`.
6. `TriggeredClipService` submits this file to `POST /api/v1/triggered-clip-upload`.
7. The route calls `pipeline.process()` and `alert_dispatcher.maybe_dispatch()`.
8. If the heavy VideoMAE models confirm a threat, standard emergency dispatch is executed.

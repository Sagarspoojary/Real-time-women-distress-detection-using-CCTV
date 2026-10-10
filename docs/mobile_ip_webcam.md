# Mobile IP Webcam Integration

This document outlines the architecture, usage, and limitations of the Mobile IP Webcam feature in the Real-Time Women Distress Detection system.

## 1. Architecture

The system allows a mobile phone (Android/iOS) running an "IP Webcam" application to act as a wireless CCTV camera.

**Flow:**
Mobile Device -> Wi-Fi -> Backend API (`/api/v1/ipwebcam/start`) -> Background IP Camera Worker -> 16-frame Buffer -> VideoMAE Model -> Temporal Threat Engine -> Email Dispatcher

The mobile feed is piped directly into the exact same AI inference classes and temporal threat state machines used by the local laptop camera. The system does **not** rely on the browser to process frames.

## 2. Setup Instructions

1. Install an app like "IP Webcam" from the Google Play Store on your mobile device.
2. Connect the phone to the **same Wi-Fi network** as the host PC.
3. Start the server in the mobile app. It will display a URL (e.g., `http://192.168.1.45:8080`).
4. On the dashboard, change the Camera Source to **Mobile IP Webcam**.
5. Enter the URL provided by the app, appending `/video` if necessary (e.g. `http://192.168.1.45:8080/video`).
6. Click **Connect**.

## 3. Security

*   **SSRF Protection**: The backend enforces a strict whitelist of schemes (`http`, `rtsp`) and blocks connections to dangerous local subnets (e.g., AWS/GCP metadata endpoints at `169.254.169.254`).
*   **Authentication**: The `/ipwebcam/*` routes are subject to the same authentication and RBAC policies as the rest of the application.

## 4. Troubleshooting & Limitations

*   **Latency**: Wireless IP webcams inherently introduce more latency than a hardwired USB laptop camera. Ensure a strong Wi-Fi connection.
*   **Buffer Control**: The backend artificially limits OpenCV's buffer size to prevent memory bloat and stale frame reading if the network lags. If the Wi-Fi drops, the backend will auto-reconnect without crashing.
*   **No Single-Image Fallback**: Snapshots taken from the dashboard UI are standard captures; they are *not* automatically classified as "Violence" without a 16-frame temporal sequence confirmation from the `VideoMAE` model.

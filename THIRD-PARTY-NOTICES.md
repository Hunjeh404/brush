# Third-party components

- MediaPipe Tasks Vision 0.10.32 (`vendor/vision_bundle.mjs`, `vendor/wasm/*`) — Google, Apache License 2.0. Package metadata and README are included in `vendor/`.
- MediaPipe Face Landmarker float16 model version 1 — downloaded from `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`. MediaPipe model documentation: https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker#models . Models may have model-card-specific terms; refer to upstream documentation. The model is distributed for local inference, not hosted inference.
- Development/test-only: linkedom (ISC), fake-indexeddb (Apache-2.0), installed by the lockfile; not loaded by the deployed app.

Application artwork provenance is listed separately in ASSET-SOURCES.md.

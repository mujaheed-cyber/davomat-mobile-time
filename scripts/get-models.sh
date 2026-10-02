#!/usr/bin/env bash
# Downloads the face-api model weights into public/models
set -euo pipefail
BASE="https://raw.githubusercontent.com/vladmandic/face-api/master/model"
cd "$(dirname "$0")/../public/models"
for f in tiny_face_detector_model face_landmark_68_model face_recognition_model; do
  curl -fsSL -O "$BASE/$f.bin"
  curl -fsSL -O "$BASE/$f-weights_manifest.json"
done
ls -la

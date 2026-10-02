import * as faceapi from "@vladmandic/face-api";

let loading: Promise<void> | null = null;

/** Loads the three small models once (~7 MB total, cached by the browser/service worker). */
export function loadModels(): Promise<void> {
  loading ??= (async () => {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
      faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
      faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
    ]);
  })().catch((e) => { loading = null; throw e; });
  return loading;
}

const detectorOpts = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.55 });

export function detectFace(video: HTMLVideoElement) {
  return faceapi.detectSingleFace(video, detectorOpts).withFaceLandmarks();
}
export function describeFace(video: HTMLVideoElement) {
  return faceapi.detectSingleFace(video, detectorOpts).withFaceLandmarks().withFaceDescriptor();
}

const dist = (a: faceapi.Point, b: faceapi.Point) => Math.hypot(a.x - b.x, a.y - b.y);
function ear(eye: faceapi.Point[]): number {
  // Eye Aspect Ratio (Soukupová & Čech, 2016)
  return (dist(eye[1], eye[5]) + dist(eye[2], eye[4])) / (2 * dist(eye[0], eye[3]));
}
export function eyeOpenness(lm: faceapi.FaceLandmarks68): number {
  return (ear(lm.getLeftEye()) + ear(lm.getRightEye())) / 2;
}

/** Counts completed blinks (open → closed → open) from a stream of EAR values. */
export class BlinkCounter {
  blinks = 0;
  private closed = false;
  update(e: number) {
    if (!this.closed && e < 0.2) this.closed = true;
    else if (this.closed && e > 0.26) { this.closed = false; this.blinks++; }
  }
}

export const EYES_OPEN = 0.26;

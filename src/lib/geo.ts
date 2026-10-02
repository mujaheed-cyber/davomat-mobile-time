import type { Branch } from "@shared/types";

export interface GpsFix { lat: number; lng: number; accuracy: number }
export type GeoErrorCode = "DENIED" | "UNAVAILABLE" | "TIMEOUT" | "UNSUPPORTED";
export class GeoError extends Error { constructor(public code: GeoErrorCode, message: string) { super(message); } }

export function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371008.8;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Watches GPS for up to `windowMs` and returns the most accurate fix (stops early at `goodEnoughM`). */
export function acquireFix(windowMs = 8000, goodEnoughM = 8): Promise<GpsFix> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new GeoError("UNSUPPORTED", "Qurilma joylashuvni qo'llab-quvvatlamaydi."));
    let best: GpsFix | null = null;
    let done = false;
    let id = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = () => { done = true; navigator.geolocation.clearWatch(id); clearTimeout(timer); };
    const finish = () => {
      if (done) return;
      stop();
      best ? resolve(best) : reject(new GeoError("TIMEOUT", "GPS signali topilmadi. Ochiq joyga chiqing."));
    };
    id = navigator.geolocation.watchPosition(
      (p) => {
        const fix = { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy };
        if (!best || fix.accuracy < best.accuracy) best = fix;
        if (fix.accuracy <= goodEnoughM) finish();
      },
      (err) => {
        if (done) return;
        stop();
        reject(
          err.code === err.PERMISSION_DENIED
            ? new GeoError("DENIED", "Joylashuvga ruxsat berilmagan. Sozlamalardan yoqing.")
            : err.code === err.TIMEOUT
              ? new GeoError("TIMEOUT", "GPS javob bermadi.")
              : new GeoError("UNAVAILABLE", "Joylashuvni aniqlab bo'lmadi."),
        );
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: windowMs + 4000 },
    );
    timer = setTimeout(finish, windowMs);
  });
}

export interface GeoVerdict { distanceM: number; accuracyM: number; inside: boolean; weakSignal: boolean }

export function evaluate(fix: GpsFix, branch: Branch): GeoVerdict {
  const distanceM = haversineM(fix, branch);
  const weakSignal = fix.accuracy > branch.maxAccuracyM;
  return { distanceM, accuracyM: fix.accuracy, weakSignal, inside: !weakSignal && distanceM <= branch.radiusM };
}

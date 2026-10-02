# Davomat — face + GPS attendance

React + Vite PWA (Tailwind, Framer Motion, Zustand) with an Express API. Face recognition runs in the browser
(`@vladmandic/face-api`); the **server** re-checks GPS distance, liveness plausibility and the face match.

## Run
```bash
npm install
npm run models      # downloads ~7 MB of face models into public/models
npm run dev         # web http://localhost:5173, api :4000
```
Seed logins: `+998900000002 / aziz12345` (employee), `+998900000001 / admin12345` (admin).
Change both passwords, set `JWT_SECRET`, and put the real branch coordinates in `server/db.ts`.

Camera and GPS only work over **HTTPS** (or localhost). For phone tests use a tunnel or deploy behind TLS.

## Android app
Wrap the built PWA with Capacitor:
```bash
npm i @capacitor/core @capacitor/cli @capacitor/android
npx cap init Davomat uz.asiahome.davomat --web-dir=dist
npx cap add android && npm run android:sync && npx cap open android
```
Add CAMERA and ACCESS_FINE_LOCATION permissions in `AndroidManifest.xml`.
In production, point `fetch` at the full API URL instead of the `/api` proxy.

## API
| Method | Path | Purpose |
|---|---|---|
| POST | /api/auth/login | phone + password → JWT |
| GET | /api/me | user, branch, today's record |
| POST | /api/face/enroll | 3–8 descriptors → averaged template |
| POST | /api/attendance/check-in | GPS + descriptor + liveness |
| POST | /api/attendance/check-out | GPS only |
| GET | /api/admin/summary | admin: today's totals and rows |

## Known limits (read before rollout)
- Blink detection stops printed photos but not a replayed video or a mask. Real anti-spoofing needs a
  dedicated presentation-attack model or a randomised challenge verified server-side.
- Browser GPS is spoofable (mock-location apps). Phone GPS is typically 3–10 m outdoors and worse inside
  a building, so ±5 m is not reliable; the default radius is 80 m. Add Wi-Fi/BSSID or QR checks for stricter control.
- Face descriptors are biometric data. Store them encrypted, get written employee consent, and replace the
  JSON file in `server/db.ts` with a real database before production.
- No automated browser/device tests were run here: the API rules, typecheck and production build were verified,
  the camera and GPS flows need testing on a real Android phone.

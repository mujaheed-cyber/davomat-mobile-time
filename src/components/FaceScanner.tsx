import { useEffect, useRef, useState } from "react";
import { BlinkCounter, describeFace, detectFace, EYES_OPEN, eyeOpenness, loadModels } from "../lib/face";
import { Button, Skeleton } from "./ui";

export interface VerifyResult { descriptor: number[]; blinks: number; durationMs: number }

type Props =
  | { mode: "verify"; onVerify: (r: VerifyResult) => void; onCancel?: () => void }
  | { mode: "enroll"; onEnroll: (descriptors: number[][]) => void; onCancel?: () => void };

type Phase = "loading" | "camera_error" | "scanning" | "done";
const NEEDED_BLINKS = 2;
const ENROLL_SAMPLES = 5;

function cameraMessage(e: unknown): string {
  const n = (e as DOMException)?.name;
  if (n === "NotAllowedError") return "Kameraga ruxsat berilmagan. Sozlamalardan yoqing.";
  if (n === "NotFoundError") return "Kamera topilmadi.";
  if (n === "NotReadableError") return "Kamera boshqa ilova tomonidan band.";
  if (!window.isSecureContext) return "Kamera faqat HTTPS orqali ishlaydi.";
  return "Kamerani ochib bo'lmadi.";
}

export default function FaceScanner(props: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const [phase, setPhase] = useState<Phase>("loading");
  const [hint, setHint] = useState("Modellar yuklanmoqda…");
  const [blinks, setBlinks] = useState(0);
  const [samples, setSamples] = useState(0);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const counter = new BlinkCounter();
    const collected: number[][] = [];
    let startedAt = 0;
    let lastSampleAt = 0;

    const finish = () => { stopped = true; setPhase("done"); stream?.getTracks().forEach((t) => t.stop()); };

    const tick = async () => {
      if (stopped) return;
      const v = videoRef.current;
      try {
        if (v && v.readyState >= 2) {
          const det = await detectFace(v);
          if (stopped) return;
          if (!det) {
            setHint("Yuzingizni oval ichiga joylashtiring");
          } else if (det.detection.box.width / v.videoWidth < 0.28) {
            setHint("Telefonni yaqinroq tuting");
          } else {
            const e = eyeOpenness(det.landmarks);
            const p = propsRef.current;
            if (p.mode === "verify") {
              startedAt ||= Date.now();
              counter.update(e);
              setBlinks(counter.blinks);
              if (counter.blinks < NEEDED_BLINKS) {
                setHint(`Ko'zingizni ${NEEDED_BLINKS - counter.blinks} marta yumib oching`);
              } else if (e > EYES_OPEN) {
                const full = await describeFace(v);
                if (full && !stopped) {
                  const result = { descriptor: Array.from(full.descriptor), blinks: counter.blinks, durationMs: Date.now() - startedAt };
                  finish();
                  p.onVerify(result);
                  return;
                }
              }
            } else {
              setHint("To'g'ri qarang, ko'zlaringiz ochiq bo'lsin");
              if (e > EYES_OPEN && Date.now() - lastSampleAt > 700) {
                const full = await describeFace(v);
                if (full && !stopped) {
                  lastSampleAt = Date.now();
                  collected.push(Array.from(full.descriptor));
                  setSamples(collected.length);
                  if (collected.length >= ENROLL_SAMPLES) { finish(); p.onEnroll(collected); return; }
                }
              }
            }
          }
        }
      } catch {
        setHint("Skanerlashda xatolik. Qayta urinilmoqda…");
      }
      timer = setTimeout(tick, 90);
    };

    (async () => {
      try {
        await loadModels();
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: false,
        });
        if (stopped) { stream.getTracks().forEach((t) => t.stop()); return; }
        const v = videoRef.current!;
        v.srcObject = stream;
        await v.play();
        setPhase("scanning");
        setHint("Yuzingizni oval ichiga joylashtiring");
        void tick();
      } catch (err) {
        if (stopped) return;
        setPhase("camera_error");
        setHint(err instanceof TypeError || (err as Error)?.message?.includes("fetch") ? "Yuz modellari yuklanmadi." : cameraMessage(err));
      }
    })();

    return () => { stopped = true; clearTimeout(timer); stream?.getTracks().forEach((t) => t.stop()); };
  }, [attempt]);

  const progress = props.mode === "verify" ? blinks / NEEDED_BLINKS : samples / ENROLL_SAMPLES;

  return (
    <div className="space-y-5">
      <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-[2rem] bg-slate8">
        <video ref={videoRef} playsInline muted className="h-full w-full -scale-x-100 object-cover" />
        {phase === "loading" && <Skeleton className="absolute inset-0 rounded-none" />}
        {phase === "scanning" && (
          <svg viewBox="0 0 100 133" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
            <defs>
              <mask id="m"><rect width="100" height="133" fill="white" /><ellipse cx="50" cy="62" rx="31" ry="40" fill="black" /></mask>
            </defs>
            <rect width="100" height="133" fill="#1F2037" opacity=".72" mask="url(#m)" />
            <ellipse cx="50" cy="62" rx="31" ry="40" fill="none" stroke="#14BBA6" strokeWidth="1.2"
              strokeDasharray="200" strokeDashoffset={200 - 200 * progress} />
          </svg>
        )}
      </div>

      <p className="min-h-[3rem] text-center text-slate-200" role="status" aria-live="polite">
        {hint}
      </p>

      {phase === "scanning" && (
        <div className="flex justify-center gap-2" aria-hidden>
          {Array.from({ length: props.mode === "verify" ? NEEDED_BLINKS : ENROLL_SAMPLES }).map((_, i) => (
            <span key={i} className={`h-2 w-8 rounded-full ${i < (props.mode === "verify" ? blinks : samples) ? "bg-brand" : "bg-white/15"}`} />
          ))}
        </div>
      )}

      {phase === "camera_error" && (
        <Button onClick={() => { setPhase("loading"); setHint("Modellar yuklanmoqda…"); setAttempt((a) => a + 1); }}>Qayta urinish</Button>
      )}
    </div>
  );
}

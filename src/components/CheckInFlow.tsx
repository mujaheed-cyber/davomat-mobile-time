import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Branch } from "@shared/types";
import { api, ApiError } from "../lib/api";
import type { GpsFix } from "../lib/geo";
import GeofenceCheck from "./GeofenceCheck";
import FaceScanner, { type VerifyResult } from "./FaceScanner";
import { Button, Skeleton } from "./ui";

type Step = "location" | "face" | "submit" | "success" | "fail";

export default function CheckInFlow({ kind, branch, onClose, onDone }:
  { kind: "in" | "out"; branch: Branch; onClose: () => void; onDone: () => void }) {
  const [step, setStep] = useState<Step>("location");
  const [fix, setFix] = useState<GpsFix | null>(null);
  const [error, setError] = useState("");

  const send = async (f: GpsFix, face?: VerifyResult) => {
    setStep("submit");
    try {
      if (kind === "in" && face) {
        await api.checkIn({ lat: f.lat, lng: f.lng, accuracy: f.accuracy, descriptor: face.descriptor,
          liveness: { blinks: face.blinks, durationMs: face.durationMs } });
      } else {
        await api.checkOut({ lat: f.lat, lng: f.lng, accuracy: f.accuracy });
      }
      setStep("success");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Noma'lum xatolik");
      setStep("fail");
    }
  };

  const titles: Record<Step, string> = {
    location: "1/2 · Joylashuv", face: "2/2 · Yuz tekshiruvi", submit: "Saqlanmoqda…",
    success: kind === "in" ? "Kelganingiz belgilandi" : "Ketganingiz belgilandi", fail: "Belgilab bo'lmadi",
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate9 px-5 pb-8 pt-6">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-extrabold">{titles[step]}</h2>
          {step !== "submit" && <button onClick={step === "success" ? onDone : onClose} className="h-10 rounded-xl px-3 text-slate-300" aria-label="Yopish">Yopish</button>}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .18 }}>
            {step === "location" && (
              <GeofenceCheck branch={branch} onPass={(f) => { setFix(f); kind === "in" ? setStep("face") : void send(f); }} />
            )}
            {step === "face" && fix && <FaceScanner mode="verify" onVerify={(r) => void send(fix, r)} />}
            {step === "submit" && <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-4 w-1/2" /></div>}
            {step === "success" && <Button onClick={onDone}>Tayyor</Button>}
            {step === "fail" && (
              <div className="space-y-5">
                <div role="alert" className="rounded-2xl border border-danger/30 bg-danger/10 p-4"><p className="text-slate-200">{error}</p></div>
                <Button onClick={() => { setError(""); setStep("location"); }}>Qayta urinish</Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

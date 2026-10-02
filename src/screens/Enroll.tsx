import { useState } from "react";
import { api } from "../lib/api";
import FaceScanner from "../components/FaceScanner";
import { Button } from "../components/ui";

export default function Enroll({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [state, setState] = useState<"scan" | "saving" | "done" | "error">("scan");
  const [error, setError] = useState("");

  const save = async (d: number[][]) => {
    setState("saving");
    try { await api.enroll(d); setState("done"); }
    catch (e) { setError((e as Error).message); setState("error"); }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate9 px-5 pb-8 pt-6">
      <div className="mx-auto max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold">Yuzni ro'yxatdan o'tkazish</h2>
          <button onClick={onClose} className="h-10 rounded-xl px-3 text-slate-300">Yopish</button>
        </div>
        {state === "scan" && <FaceScanner mode="enroll" onEnroll={(d) => void save(d)} />}
        {state === "saving" && <p className="text-slate-300">Saqlanmoqda…</p>}
        {state === "done" && <><p className="text-slate-200">Yuzingiz saqlandi. Endi kelganingizni belgilashingiz mumkin.</p><Button onClick={onDone}>Tayyor</Button></>}
        {state === "error" && <><p role="alert" className="text-danger">{error}</p><Button onClick={() => setState("scan")}>Qayta urinish</Button></>}
      </div>
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { Branch } from "@shared/types";
import { acquireFix, evaluate, GeoError, type GeoVerdict, type GpsFix } from "../lib/geo";
import { Button, Skeleton } from "./ui";

type State =
  | { s: "loading" }
  | { s: "result"; fix: GpsFix; v: GeoVerdict }
  | { s: "error"; msg: string; denied: boolean };

export default function GeofenceCheck({ branch, onPass }: { branch: Branch; onPass: (fix: GpsFix) => void }) {
  const [st, setSt] = useState<State>({ s: "loading" });

  const run = useCallback(async () => {
    setSt({ s: "loading" });
    try {
      const fix = await acquireFix();
      setSt({ s: "result", fix, v: evaluate(fix, branch) });
    } catch (e) {
      const g = e as GeoError;
      setSt({ s: "error", msg: g.message, denied: g.code === "DENIED" });
    }
  }, [branch]);

  useEffect(() => { void run(); }, [run]);

  if (st.s === "loading")
    return (
      <div className="space-y-4" aria-busy="true">
        <p className="text-slate-300">Joylashuv aniqlanmoqda…</p>
        <Skeleton className="h-28" /><Skeleton className="h-4 w-2/3" />
      </div>
    );

  if (st.s === "error")
    return (
      <div className="space-y-5">
        <Problem title="Joylashuv olinmadi" text={st.msg} />
        {st.denied && <p className="text-sm text-slate-400">Brauzer yoki telefon sozlamalarida ushbu ilova uchun joylashuvni yoqing.</p>}
        <Button onClick={run}>GPS’ni qayta hisoblash</Button>
      </div>
    );

  const { v } = st;
  const pct = Math.min(100, (v.distanceM / branch.radiusM) * 100);
  return (
    <div className="space-y-5">
      <motion.div initial={{ scale: .96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass rounded-3xl p-6 text-center">
        <p className="text-sm text-slate-400">{branch.name}gacha masofa</p>
        <p className={`num mt-1 text-5xl font-extrabold ${v.inside ? "text-brand" : "text-danger"}`}>
          {v.distanceM.toFixed(1)}<span className="text-2xl font-bold"> m</span>
        </p>
        <p className="num mt-1 text-sm text-slate-400">GPS aniqligi ±{v.accuracyM.toFixed(1)} m · ruxsat {branch.radiusM} m</p>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
          <div className={`h-full rounded-full ${v.inside ? "bg-brand" : "bg-danger"}`} style={{ width: `${pct}%` }} />
        </div>
      </motion.div>

      {v.inside ? (
        <Button onClick={() => onPass(st.fix)}>Davom etish</Button>
      ) : (
        <>
          <Problem
            title={v.weakSignal ? "GPS signali zaif" : "Siz filial hududidan tashqaridasiz"}
            text={v.weakSignal
              ? `Aniqlik ±${v.accuracyM.toFixed(0)} m, talab ≤ ${branch.maxAccuracyM} m. Ochiq joyga chiqing.`
              : `Filialga ${Math.max(0, v.distanceM - branch.radiusM).toFixed(0)} m yaqinlashing.`}
          />
          <Button onClick={run}>GPS’ni qayta hisoblash</Button>
        </>
      )}
    </div>
  );
}

function Problem({ title, text }: { title: string; text: string }) {
  return (
    <div role="alert" className="rounded-2xl border border-danger/30 bg-danger/10 p-4">
      <p className="font-bold text-danger">{title}</p>
      <p className="mt-1 text-sm text-slate-300">{text}</p>
    </div>
  );
}

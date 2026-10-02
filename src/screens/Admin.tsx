import { useEffect, useState } from "react";
import { api, type Summary } from "../lib/api";
import { useSession } from "../store/session";
import { Badge, Card, fmtTime, Skeleton } from "../components/ui";
import type { AttendanceStatus } from "@shared/types";

export default function Admin() {
  const { me, logout } = useSession();
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    const load = () => api.summary().then((d) => alive && setData(d)).catch((e: Error) => alive && setError(e.message));
    void load();
    const t = setInterval(load, 30_000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const stat = (label: string, v: number | string) => (
    <Card className="!p-4"><p className="text-xs text-slate-400">{label}</p><p className="num text-3xl font-extrabold">{v}</p></Card>
  );

  return (
    <main className="mx-auto max-w-2xl space-y-4 px-5 pb-10 pt-6">
      <header className="flex items-start justify-between">
        <div><p className="text-slate-400">{me?.branch.name}</p><h1 className="text-3xl font-extrabold">Bugungi davomat</h1></div>
        <button onClick={logout} className="h-10 rounded-xl px-3 text-sm text-slate-400">Chiqish</button>
      </header>
      {error && <p role="alert" className="text-danger">{error}</p>}
      {!data ? (
        <div className="grid grid-cols-2 gap-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            {stat("Kelganlar", `${data.totals.checkedIn}/${data.totals.employees}`)}
            {stat("Vaqtida", data.totals.onTime)}
            {stat("Kechikkanlar", data.totals.late)}
            {stat("Kelmaganlar", data.totals.absent)}
          </div>
          <Card className="!p-2">
            {data.rows.length === 0 && <p className="p-4 text-slate-400">Hodimlar yo'q.</p>}
            <ul className="divide-y divide-white/10">
              {data.rows.map((r) => (
                <li key={r.user.id} className="flex items-center justify-between gap-3 p-3">
                  <div>
                    <p className="font-bold">{r.user.name}</p>
                    <p className="num text-sm text-slate-400">{fmtTime(r.record?.checkInAt)} – {fmtTime(r.record?.checkOutAt)}
                      {r.record?.distanceM != null && ` · ${r.record.distanceM} m`}</p>
                  </div>
                  {r.status ? <Badge status={r.status as AttendanceStatus} /> : <span className="text-sm text-slate-500">Kutilmoqda</span>}
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </main>
  );
}

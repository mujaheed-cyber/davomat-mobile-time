import { useEffect, useState } from "react";
import { useSession } from "../store/session";
import { Badge, Button, Card, fmtTime } from "../components/ui";
import CheckInFlow from "../components/CheckInFlow";
import Enroll from "./Enroll";

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  return now;
}
const tz = "Asia/Tashkent";
const greeting = (d: Date) => {
  const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hour12: false }).format(d)) % 24;
  return h < 12 ? "Xayrli tong" : h < 18 ? "Xayrli kun" : "Xayrli kech";
};

export default function Employee() {
  const { me, refresh, logout } = useSession();
  const now = useClock();
  const [flow, setFlow] = useState<null | "in" | "out" | "enroll">(null);
  if (!me) return null;
  const { user, branch, today } = me;

  const date = new Intl.DateTimeFormat("uz-UZ", { timeZone: tz, weekday: "long", day: "numeric", month: "long" }).format(now);
  const clock = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(now);
  const done = () => { setFlow(null); void refresh(); };

  return (
    <main className="mx-auto max-w-md space-y-4 px-5 pb-10 pt-6">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-slate-400">{greeting(now)},</p>
          <h1 className="text-3xl font-extrabold">{user.name}</h1>
        </div>
        <button onClick={logout} className="h-10 rounded-xl px-3 text-sm text-slate-400">Chiqish</button>
      </header>

      <Card>
        <p className="text-sm text-slate-400">{branch.name}</p>
        <p className="num mt-1 text-5xl font-extrabold tracking-tight">{clock}</p>
        <p className="mt-1 capitalize text-slate-400">{date}</p>
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
          <div><p className="text-xs text-slate-400">Ochilish</p><p className="num text-xl font-bold">{branch.opensAt}</p></div>
          <div><p className="text-xs text-slate-400">Yopilish</p><p className="num text-xl font-bold">{branch.closesAt}</p></div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <p className="font-bold">Bugungi holat</p>
          {today ? (today.checkOutAt ? <Badge status={today.status} /> : <span className="rounded-full bg-brand/15 px-3 py-1 text-xs font-semibold text-brand">Ishda</span>) : <span className="text-sm text-slate-400">Hali belgilanmagan</span>}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div><p className="text-xs text-slate-400">Keldi</p><p className="num text-xl font-bold">{fmtTime(today?.checkInAt)}</p></div>
          <div><p className="text-xs text-slate-400">Ketdi</p><p className="num text-xl font-bold">{fmtTime(today?.checkOutAt)}</p></div>
        </div>
        {today && !today.checkOutAt && today.status === "late" && <div className="mt-3"><Badge status="late" /></div>}
      </Card>

      {!user.faceEnrolled ? (
        <Button onClick={() => setFlow("enroll")}>Yuzni ro'yxatdan o'tkazish</Button>
      ) : !today ? (
        <Button onClick={() => setFlow("in")}>Kelganimni belgilash</Button>
      ) : !today.checkOutAt ? (
        <Button onClick={() => setFlow("out")}>Ketganimni belgilash</Button>
      ) : (
        <p className="text-center text-slate-400">Bugungi ish kuni yakunlandi.</p>
      )}

      {flow === "enroll" && <Enroll onClose={() => setFlow(null)} onDone={done} />}
      {(flow === "in" || flow === "out") && <CheckInFlow kind={flow} branch={branch} onClose={() => setFlow(null)} onDone={done} />}
    </main>
  );
}

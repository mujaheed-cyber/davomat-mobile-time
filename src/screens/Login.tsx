import { useState } from "react";
import { useSession } from "../store/session";
import { Button } from "../components/ui";

export default function Login() {
  const login = useSession((s) => s.login);
  const [phone, setPhone] = useState("+998");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try { await login(phone.trim(), password); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };

  const field = "h-14 w-full rounded-2xl border border-white/10 bg-slate8 px-4 text-base text-white placeholder:text-slate-500";
  return (
    <main className="mx-auto flex min-h-full max-w-sm flex-col justify-center px-6">
      <h1 className="text-4xl font-extrabold tracking-tight">Davomat</h1>
      <p className="mt-2 text-slate-400">Filialdagi ish vaqtingizni belgilash uchun kiring.</p>
      <form onSubmit={submit} className="mt-10 space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm text-slate-400">Telefon raqam</span>
          <input className={field} inputMode="tel" autoComplete="username" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-slate-400">Parol</span>
          <input className={field} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={busy || password.length === 0}>{busy ? "Kirilmoqda…" : "Kirish"}</Button>
      </form>
    </main>
  );
}

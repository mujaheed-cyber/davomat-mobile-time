import type { ReactNode } from "react";
import type { AttendanceStatus } from "@shared/types";

export const STATUS_LABEL: Record<AttendanceStatus, string> = {
  on_time: "Vaqtida", late: "Kechikdi", overtime: "Qo'shimcha ish",
  early_leave: "Erta ketdi", absent: "Kelmadi", working: "Ishda",
};
const STATUS_STYLE: Record<AttendanceStatus, string> = {
  on_time: "bg-brand/15 text-brand", late: "bg-warn/15 text-warn", overtime: "bg-sky-400/15 text-sky-300",
  early_leave: "bg-warn/15 text-warn", absent: "bg-danger/15 text-danger", working: "bg-white/10 text-slate-200",
};

export function Badge({ status }: { status: AttendanceStatus }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`glass rounded-3xl p-5 ${className}`}>{children}</div>;
}

export function Button({ children, variant = "primary", className = "", ...p }:
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }) {
  const base = "h-14 w-full rounded-2xl text-base font-bold transition active:scale-[.98] disabled:opacity-40 disabled:active:scale-100";
  const look = variant === "primary" ? "bg-brand text-slate9 shadow-[0_8px_30px_-8px_#14BBA6]" : "glass text-slate-100";
  return <button className={`${base} ${look} ${className}`} {...p}>{children}</button>;
}

export const Skeleton = ({ className = "" }: { className?: string }) => <div className={`skeleton ${className}`} />;

export const fmtTime = (iso?: string) =>
  iso ? new Intl.DateTimeFormat("uz-UZ", { timeZone: "Asia/Tashkent", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso)) : "—";

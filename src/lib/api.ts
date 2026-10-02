import type { AttendanceRecord, CheckInBody, MeResponse, User } from "@shared/types";

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) { super(message); }
}

let token: string | null = sessionStorage.getItem("token");
export const setToken = (t: string | null) => {
  token = t;
  if (t) sessionStorage.setItem("token", t); else sessionStorage.removeItem("token");
};
export const hasToken = () => !!token;

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
  } catch {
    throw new ApiError("Serverga ulanib bo'lmadi. Internetni tekshiring.", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? "Noma'lum xatolik", res.status, data.code);
  return data as T;
}
const post = <T,>(p: string, body: unknown) => req<T>(p, { method: "POST", body: JSON.stringify(body) });

export interface SummaryRow { user: User; record: AttendanceRecord | null; status: string | null }
export interface Summary {
  date: string; rows: SummaryRow[];
  totals: { employees: number; onTime: number; late: number; absent: number; checkedIn: number };
}

export const api = {
  login: (phone: string, password: string) => post<{ token: string; user: User }>("/auth/login", { phone, password }),
  me: () => req<MeResponse>("/me"),
  enroll: (descriptors: number[][]) => post<{ ok: true }>("/face/enroll", { descriptors }),
  checkIn: (b: CheckInBody) => post<{ record: AttendanceRecord }>("/attendance/check-in", b),
  checkOut: (b: { lat: number; lng: number; accuracy: number }) => post<{ record: AttendanceRecord }>("/attendance/check-out", b),
  summary: () => req<Summary>("/admin/summary"),
};

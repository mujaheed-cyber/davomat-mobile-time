import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { db, save, type StoredUser } from "./db";
import { haversineM } from "./geo";
import { hhmmToMin, localParts } from "./time";
import type { AttendanceRecord, MeResponse, User } from "../shared/types";

const SECRET = process.env.JWT_SECRET ?? "dev-only-change-me";
const FACE_MATCH_MAX = 0.5;   // euclidean distance on face-api descriptors (lower = stricter)
const MIN_BLINKS = 2;
const MIN_LIVENESS_MS = 1200; // a real challenge cannot finish instantly

const app = express();
app.use(cors());
app.use(express.json({ limit: "100kb" }));

type Authed = Request & { user: StoredUser };
const publicUser = (u: StoredUser): User => ({
  id: u.id, name: u.name, phone: u.phone, role: u.role, branchId: u.branchId,
  faceEnrolled: !!u.faceTemplate,
});

function auth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = (req.headers.authorization ?? "").replace("Bearer ", "");
    const { sub } = jwt.verify(token, SECRET) as { sub: string };
    const user = db.users.find((u) => u.id === sub);
    if (!user) throw new Error("no user");
    (req as Authed).user = user;
    next();
  } catch {
    res.status(401).json({ error: "Sessiya tugagan. Qayta kiring." });
  }
}
const adminOnly = (req: Request, res: Response, next: NextFunction) =>
  (req as Authed).user.role === "admin" ? next() : res.status(403).json({ error: "Ruxsat yo'q." });

// simple login throttle: 5 failures / 10 min per phone
const fails = new Map<string, { n: number; at: number }>();

app.post("/api/auth/login", (req, res) => {
  const body = z.object({ phone: z.string().min(5), password: z.string().min(1) }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Telefon va parolni kiriting." });
  const { phone, password } = body.data;
  const f = fails.get(phone);
  if (f && f.n >= 5 && Date.now() - f.at < 10 * 60_000)
    return res.status(429).json({ error: "Juda ko'p urinish. 10 daqiqadan so'ng qayta urinib ko'ring." });
  const user = db.users.find((u) => u.phone === phone);
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    fails.set(phone, { n: (f?.n ?? 0) + 1, at: Date.now() });
    return res.status(401).json({ error: "Telefon yoki parol noto'g'ri." });
  }
  fails.delete(phone);
  const token = jwt.sign({ sub: user.id }, SECRET, { expiresIn: "12h" });
  res.json({ token, user: publicUser(user) });
});

function todayRecord(userId: string, date: string) {
  return db.records.find((r) => r.userId === userId && r.date === date) ?? null;
}

app.get("/api/me", auth, (req, res) => {
  const user = (req as Authed).user;
  const branch = db.branches.find((b) => b.id === user.branchId)!;
  const now = new Date();
  const body: MeResponse = {
    user: publicUser(user), branch,
    today: todayRecord(user.id, localParts(now).date),
    serverTime: now.toISOString(),
  };
  res.json(body);
});

const descriptorSchema = z.array(z.number()).length(128);

app.post("/api/face/enroll", auth, (req, res) => {
  const user = (req as Authed).user;
  const body = z.object({ descriptors: z.array(descriptorSchema).min(3).max(8) }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Kamida 3 ta aniq yuz namunasi kerak." });
  // average several captures into one template
  const n = body.data.descriptors.length;
  user.faceTemplate = Array.from({ length: 128 }, (_, i) =>
    body.data.descriptors.reduce((s, d) => s + d[i], 0) / n);
  save();
  res.json({ ok: true });
});

const euclid = (a: number[], b: number[]) => Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));

app.post("/api/attendance/check-in", auth, (req, res) => {
  const user = (req as Authed).user;
  const branch = db.branches.find((b) => b.id === user.branchId)!;
  const body = z.object({
    lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180),
    accuracy: z.number().nonnegative(), descriptor: descriptorSchema,
    liveness: z.object({ blinks: z.number(), durationMs: z.number() }),
  }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Ma'lumotlar noto'g'ri." });
  const b = body.data;

  if (!user.faceTemplate) return res.status(409).json({ error: "Avval yuzingizni ro'yxatdan o'tkazing.", code: "NOT_ENROLLED" });

  // 1. location (re-checked on the server; never trust the client's verdict)
  if (b.accuracy > branch.maxAccuracyM)
    return res.status(422).json({ error: `GPS aniqligi past (±${Math.round(b.accuracy)} m). Ochiq joyda qayta urinib ko'ring.`, code: "GPS_WEAK" });
  const distance = haversineM(b.lat, b.lng, branch.lat, branch.lng);
  if (distance > branch.radiusM)
    return res.status(422).json({ error: `Siz filialdan ${Math.round(distance)} m uzoqdasiz (ruxsat: ${branch.radiusM} m).`, code: "OUT_OF_RANGE", distance });

  // 2. liveness plausibility
  if (b.liveness.blinks < MIN_BLINKS || b.liveness.durationMs < MIN_LIVENESS_MS)
    return res.status(422).json({ error: "Jonlilik tekshiruvi o'tmadi.", code: "LIVENESS" });

  // 3. face match
  const faceDistance = euclid(b.descriptor, user.faceTemplate);
  if (faceDistance > FACE_MATCH_MAX)
    return res.status(422).json({ error: "Yuz mos kelmadi.", code: "FACE_MISMATCH" });

  const now = new Date();
  const { date, minutes } = localParts(now);
  if (todayRecord(user.id, date)?.checkInAt) return res.status(409).json({ error: "Bugun allaqachon belgilangansiz." });

  const late = minutes > hhmmToMin(branch.opensAt) + branch.graceMin;
  const rec: AttendanceRecord = {
    id: randomUUID(), userId: user.id, date,
    checkInAt: now.toISOString(), status: late ? "late" : "on_time",
    distanceM: Math.round(distance * 10) / 10, gpsAccuracyM: Math.round(b.accuracy * 10) / 10,
    faceDistance: Math.round(faceDistance * 1000) / 1000,
  };
  db.records.push(rec);
  save();
  res.json({ record: rec });
});

app.post("/api/attendance/check-out", auth, (req, res) => {
  const user = (req as Authed).user;
  const branch = db.branches.find((b) => b.id === user.branchId)!;
  const body = z.object({ lat: z.number(), lng: z.number(), accuracy: z.number().nonnegative() }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Ma'lumotlar noto'g'ri." });
  const now = new Date();
  const { date, minutes } = localParts(now);
  const rec = todayRecord(user.id, date);
  if (!rec?.checkInAt) return res.status(409).json({ error: "Avval kelganingizni belgilang." });
  if (rec.checkOutAt) return res.status(409).json({ error: "Bugun ketganingiz allaqachon belgilangan." });
  const distance = haversineM(body.data.lat, body.data.lng, branch.lat, branch.lng);
  if (body.data.accuracy > branch.maxAccuracyM || distance > branch.radiusM)
    return res.status(422).json({ error: "Ketishni belgilash uchun filial hududida bo'lishingiz kerak.", code: "OUT_OF_RANGE" });
  rec.checkOutAt = now.toISOString();
  const close = hhmmToMin(branch.closesAt);
  if (minutes >= close + branch.overtimeAfterMin) rec.status = "overtime";
  else if (minutes < close) rec.status = "early_leave";
  save();
  res.json({ record: rec });
});

app.get("/api/attendance/logs", auth, (req, res) => {
  const user = (req as Authed).user;
  res.json({ records: db.records.filter((r) => r.userId === user.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 60) });
});

app.get("/api/admin/summary", auth, adminOnly, (_req, res) => {
  const { date, minutes } = localParts(new Date());
  const rows = db.users.filter((u) => u.role === "employee").map((u) => {
    const branch = db.branches.find((b) => b.id === u.branchId)!;
    const record = todayRecord(u.id, date);
    const pastOpen = minutes > hhmmToMin(branch.opensAt) + branch.graceMin;
    const status = record ? record.status : pastOpen ? "absent" : null;
    return { user: publicUser(u), record, status };
  });
  res.json({
    date, rows,
    totals: { employees: rows.length, onTime: rows.filter((r) => r.record?.status === "on_time").length,
      late: rows.filter((r) => r.record?.status === "late").length, absent: rows.filter((r) => r.status === "absent").length, checkedIn: rows.filter((r) => r.record?.checkInAt).length },
  });
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => console.log(`API http://localhost:${port}`));

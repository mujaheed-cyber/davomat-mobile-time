import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import type { AttendanceRecord, Branch, Role } from "../shared/types";

export interface StoredUser {
  id: string; name: string; phone: string; role: Role; branchId: string;
  passwordHash: string; faceTemplate: number[] | null;
}
interface DB { users: StoredUser[]; branches: Branch[]; records: AttendanceRecord[] }

const FILE = path.resolve(process.cwd(), "server/data.json");

function seed(): DB {
  return {
    branches: [
      {
        id: "b1",
        name: "Alfraganus filiali",
        lat: 41.2995, lng: 69.2401, // TODO: replace with the real store coordinates
        radiusM: 80, maxAccuracyM: 40,
        opensAt: "10:00", closesAt: "22:00", graceMin: 10, overtimeAfterMin: 30,
      },
    ],
    users: [
      { id: "u1", name: "Admin", phone: "+998900000001", role: "admin", branchId: "b1",
        passwordHash: bcrypt.hashSync("admin12345", 10), faceTemplate: null },
      { id: "u2", name: "Aziz", phone: "+998900000002", role: "employee", branchId: "b1",
        passwordHash: bcrypt.hashSync("aziz12345", 10), faceTemplate: null },
    ],
    records: [],
  };
}

export const db: DB = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, "utf8")) : seed();
export function save() { fs.writeFileSync(FILE, JSON.stringify(db, null, 2)); }
if (!fs.existsSync(FILE)) save();

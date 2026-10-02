export type Role = "admin" | "employee";
export type AttendanceStatus = "on_time" | "late" | "overtime" | "early_leave" | "absent" | "working";

export interface Branch {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusM: number;      // allowed geofence radius
  maxAccuracyM: number; // reject GPS fixes worse than this
  opensAt: string;      // "10:00"
  closesAt: string;     // "22:00"
  graceMin: number;     // minutes after opening still counted "on time"
  overtimeAfterMin: number; // minutes after closing before "overtime" starts
}

export interface User {
  id: string;
  name: string;
  phone: string;
  role: Role;
  branchId: string;
  faceEnrolled: boolean;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD in branch timezone
  checkInAt?: string;  // ISO
  checkOutAt?: string; // ISO
  status: AttendanceStatus;
  distanceM?: number;
  gpsAccuracyM?: number;
  faceDistance?: number;
}

export interface MeResponse {
  user: User;
  branch: Branch;
  today: AttendanceRecord | null;
  serverTime: string;
}

export interface CheckInBody {
  lat: number;
  lng: number;
  accuracy: number;
  descriptor: number[]; // 128-d face embedding
  liveness: { blinks: number; durationMs: number };
}

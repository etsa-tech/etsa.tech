export type AttendanceFormat = "in-person" | "virtual" | "hybrid";

export interface AttendanceRecord {
  id: string;
  eventDate: string; // ISO 8601 date - source of truth for yearly grouping
  postSlug: string; // links into posts/*.md
  eventTitle: string; // denormalized post title, survives post rename/deletion
  format: AttendanceFormat;
  inPersonCount: number;
  virtualCount: number;
  notes?: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  updatedBy: string | null; // session email of last editor
}

export type AttendanceRecordInput = Pick<
  AttendanceRecord,
  | "eventDate"
  | "postSlug"
  | "eventTitle"
  | "format"
  | "inPersonCount"
  | "virtualCount"
  | "notes"
>;

export interface YearlyAttendanceStats {
  year: number;
  eventCount: number;
  avgTotal: number;
  avgInPerson: number;
  avgVirtual: number;
}

export interface OverallAttendanceStats {
  totalEvents: number;
  avgTotal: number;
  avgInPerson: number;
  avgVirtual: number;
  firstEventDate: string | null;
  lastEventDate: string | null;
}

export interface AttendanceStats {
  overall: OverallAttendanceStats;
  yearly: YearlyAttendanceStats[];
}

export interface SpeakerAttendanceStats {
  speakerName: string;
  eventCount: number;
  avgTotal: number;
  avgInPerson: number;
  avgVirtual: number;
  // The individual events behind the averages above, oldest first - powers
  // the expandable per-talk breakdown on the admin speakers page.
  records: AttendanceRecord[];
}

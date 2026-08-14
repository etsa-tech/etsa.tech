import { NextResponse } from "next/server";
import { listAttendanceRecords } from "@/lib/attendance-store";
import { computeAttendanceStats } from "@/lib/attendance-stats";

// Public, unauthenticated - deliberately returns only computed aggregates,
// never the raw AttendanceRecord[] the admin routes expose. Enforces the
// admin-vs-public exposure split at the API boundary, not just in the UI.
export async function GET() {
  try {
    const records = await listAttendanceRecords();
    const stats = computeAttendanceStats(records);
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error computing public attendance stats:", error);
    return NextResponse.json(
      { error: "Failed to load attendance stats" },
      { status: 500 },
    );
  }
}

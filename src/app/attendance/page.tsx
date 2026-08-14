import { listAttendanceRecords } from "@/lib/attendance-store";
import { computeAttendanceStats } from "@/lib/attendance-stats";
import { AttendanceStats } from "@/components/AttendanceStats";

// ISR, not force-static - Netlify Blobs' automatic context (siteID/token)
// is only available to a live Function invocation, not the `next build`
// step that force-static would run this page's data fetch under (confirmed
// by the MissingBlobsEnvironmentError that threw in production, and by the
// same error still showing up in a plain local `next build` below - the
// try/catch's empty-data fallback is what that build bakes in). The
// difference from force-static is that this page doesn't stay wrong forever:
// once this window elapses, the next request triggers a background
// regeneration inside a real Function invocation - where Blobs works - and
// that refreshed result is what gets cached and served after that. So this
// is still a cached/static page for nearly all traffic, not a Function call
// per visit, while self-healing within a day of an admin edit instead of
// needing a rebuild. Renders only aggregates (see
// src/app/api/attendance/stats/route.ts, the same read this page does),
// never a per-event table.
export const revalidate = 86400; // 1 day

export const metadata = {
  title: "Attendance - ETSA",
  description:
    "How many people come to ETSA meetups - yearly averages and in-person vs. virtual attendance.",
};

export default async function AttendancePage() {
  // Local `next build`/`next dev` (outside an actual Netlify Function
  // invocation) still has no Blobs context - fall back to an empty data set
  // rather than crashing the page when that's the case.
  let records: Awaited<ReturnType<typeof listAttendanceRecords>> = [];
  try {
    records = await listAttendanceRecords();
  } catch (error) {
    console.error("Error loading attendance records:", error);
  }
  const stats = computeAttendanceStats(records);

  return (
    <div className="container py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Attendance
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          How many people come to ETSA meetups, tracked since we started keeping
          records.
        </p>
      </div>

      <AttendanceStats stats={stats} />
    </div>
  );
}

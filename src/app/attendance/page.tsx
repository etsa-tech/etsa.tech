import { listAttendanceRecords } from "@/lib/attendance-store";
import { computeAttendanceStats } from "@/lib/attendance-stats";
import { AttendanceStats } from "@/components/AttendanceStats";

// Rendered per-request, not statically - Netlify Blobs' automatic context
// (siteID/token) is only available to a live Function invocation, not the
// `next build` step that would run this page's data fetch under
// force-static (confirmed by the MissingBlobsEnvironmentError that static
// mode threw in production). Deliberately renders only aggregates (see
// src/app/api/attendance/stats/route.ts, the same read this page does),
// never a per-event table.
export const dynamic = "force-dynamic";

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

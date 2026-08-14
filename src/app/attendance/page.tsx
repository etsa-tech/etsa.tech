import { listAttendanceRecords } from "@/lib/attendance-store";
import { computeAttendanceStats } from "@/lib/attendance-stats";
import { AttendanceStats } from "@/components/AttendanceStats";

// Static export - regenerates on the next site build/deploy, same
// staleness model the rest of the public site already has for git-based
// content. Deliberately renders only aggregates (see
// src/app/api/attendance/stats/route.ts), never a per-event table.
export const dynamic = "force-static";

export const metadata = {
  title: "Attendance - ETSA",
  description:
    "How many people come to ETSA meetups - yearly averages and in-person vs. virtual attendance.",
};

export default async function AttendancePage() {
  // Blobs needs a live Netlify site context (siteID/token), which is only
  // present during an actual Netlify build/deploy - not a plain local
  // `next build`. Fall back to an empty data set rather than crashing static
  // generation when that context isn't available.
  let records: Awaited<ReturnType<typeof listAttendanceRecords>> = [];
  try {
    records = await listAttendanceRecords();
  } catch (error) {
    console.error("Error loading attendance records for static page:", error);
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

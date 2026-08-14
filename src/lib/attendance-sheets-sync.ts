import "server-only";
import { AttendanceRecord } from "@/types/attendance";

// ATTENDANCE_SHEETS_WEBHOOK_URL is only ever set in the deployed Netlify
// environment - a developer's local .env deliberately leaves it unset so
// local testing never writes into the real Sheet. Its absence doubles as
// this feature's local/deployed signal: blank means local, which is also
// exactly when deleting an attendance record is allowed (see the DELETE
// route and deleteAttendanceRecord in attendance-store.ts) - there's no
// Sheet to protect from a delete when the webhook isn't even configured.
export function isAttendanceSheetsConfigured(): boolean {
  return Boolean(process.env.ATTENDANCE_SHEETS_WEBHOOK_URL);
}

// Mirrors attendance record creates/edits to a Google Sheet via an Apps
// Script webhook, separate from GOOGLE_SHEETS_WEBHOOK_URL (the RSVP form's
// webhook, which writes to a different sheet). See
// docs/attendance-sheets-setup.md. Blobs (src/lib/attendance-store.ts) is
// the app's source of truth - a create/edit only succeeds if this sync also
// succeeds (see saveAttendanceRecord's rollback). Deletes are never sent
// here at all - deleting is a local-development-only action that only ever
// touches Blobs, by design, so the Sheet stays the durable record even if a
// board member fat-fingers a delete locally.
export async function syncAttendanceRecordToSheets(
  record: AttendanceRecord,
): Promise<void> {
  const webhookUrl = process.env.ATTENDANCE_SHEETS_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error("Attendance Sheets webhook URL not configured");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Attendance Sheets webhook returned ${response.status}`);
    }

    const result = await response.json();
    if (result?.error) {
      throw new Error(result.error);
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

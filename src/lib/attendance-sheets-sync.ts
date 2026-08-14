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

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
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

  const response = await fetchWithTimeout(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record),
  });

  if (!response.ok) {
    throw new Error(`Attendance Sheets webhook returned ${response.status}`);
  }

  const result = await response.json();
  if (result?.error) {
    throw new Error(result.error);
  }

  await verifyAttendanceRecordInSheets(record, webhookUrl);
}

// The webhook can report success even when the write didn't actually land -
// e.g. concurrent bulk-import requests racing on the Apps Script's
// read-then-write (find existing row, then append/overwrite) without
// locking can silently drop or clobber a row while every request still gets
// a 200 back. Read the row back by id and check the counts that actually
// matter, so a collision like that fails loudly here - which rolls back the
// Blobs write via saveAttendanceRecord - instead of Blobs and the Sheet
// silently diverging. Requires the Apps Script's doGet(?id=) handler from
// docs/attendance-sheets-setup.md; an older deployment without it will fail
// verification for every save, so that script must be redeployed first.
async function verifyAttendanceRecordInSheets(
  record: AttendanceRecord,
  webhookUrl: string,
): Promise<void> {
  const url = `${webhookUrl}?id=${encodeURIComponent(record.id)}`;
  const response = await fetchWithTimeout(url, { method: "GET" });

  if (!response.ok) {
    throw new Error(
      `Attendance Sheets verification returned ${response.status}`,
    );
  }

  const result = await response.json();
  if (!result?.found) {
    throw new Error(
      "Attendance Sheets verification: row not found after write",
    );
  }

  const row = result.row ?? {};
  if (
    Number(row.inPersonCount) !== record.inPersonCount ||
    Number(row.virtualCount) !== record.virtualCount
  ) {
    throw new Error(
      "Attendance Sheets verification: written row doesn't match (possible concurrent write collision)",
    );
  }
}

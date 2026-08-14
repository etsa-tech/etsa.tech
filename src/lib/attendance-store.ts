import "server-only";
import { getStore } from "@netlify/blobs";
import { AttendanceRecord } from "@/types/attendance";
import {
  isAttendanceSheetsConfigured,
  syncAttendanceRecordToSheets,
} from "@/lib/attendance-sheets-sync";

const STORE_NAME = "attendance";

function getAttendanceStore() {
  return getStore(STORE_NAME);
}

export async function listAttendanceRecords(): Promise<AttendanceRecord[]> {
  const store = getAttendanceStore();
  const { blobs } = await store.list();

  const records = await Promise.all(
    blobs.map(({ key }) => store.get(key, { type: "json" })),
  );

  return (records.filter(Boolean) as AttendanceRecord[]).sort((a, b) =>
    b.eventDate.localeCompare(a.eventDate),
  );
}

export async function getAttendanceRecord(
  id: string,
): Promise<AttendanceRecord | null> {
  const store = getAttendanceStore();
  const record = await store.get(id, { type: "json" });
  return (record as AttendanceRecord | null) ?? null;
}

// Powers the per-post attendance view linked from the blog post's admin
// actions - at most one record is expected per post, so the first match
// (if any) is returned.
export async function getAttendanceRecordByPostSlug(
  postSlug: string,
): Promise<AttendanceRecord | null> {
  const records = await listAttendanceRecords();
  return records.find((record) => record.postSlug === postSlug) ?? null;
}

// When the Sheets webhook isn't configured, we're in local development (see
// isAttendanceSheetsConfigured) - there's no Sheet to sync to, so just write
// to Blobs. Once it *is* configured, Blobs and Sheets are written
// concurrently and a record must not end up persisted unless both succeed -
// if the Sheets mirror fails, the Blobs write is rolled back (deleted for a
// new record, restored to `previous` for an edit) rather than left
// half-committed.
export async function saveAttendanceRecord(
  record: AttendanceRecord,
  previous: AttendanceRecord | null = null,
): Promise<{ record: AttendanceRecord }> {
  const store = getAttendanceStore();

  if (!isAttendanceSheetsConfigured()) {
    await store.setJSON(record.id, record);
    return { record };
  }

  try {
    await Promise.all([
      store.setJSON(record.id, record),
      syncAttendanceRecordToSheets(record),
    ]);
  } catch (error) {
    if (previous) {
      await store.setJSON(record.id, previous).catch(() => {});
    } else {
      await store.delete(record.id).catch(() => {});
    }
    throw error;
  }

  return { record };
}

// Local-development-only (enforced by the caller - see
// attendance-sheets-sync.ts#isAttendanceSheetsConfigured and the DELETE
// route) and deliberately never mirrored to Sheets - the Sheet is the
// durable record precisely because deletes can't touch it.
export async function deleteAttendanceRecord(id: string): Promise<void> {
  const store = getAttendanceStore();
  await store.delete(id);
}

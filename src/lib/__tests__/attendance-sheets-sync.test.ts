import {
  isAttendanceSheetsConfigured,
  syncAttendanceRecordToSheets,
} from "@/lib/attendance-sheets-sync";
import { AttendanceRecord } from "@/types/attendance";

const originalEnv = process.env;
const originalFetch = global.fetch;

const record: AttendanceRecord = {
  id: "1",
  eventDate: "2025-01-01",
  postSlug: "slug",
  eventTitle: "Title",
  format: "hybrid",
  inPersonCount: 10,
  virtualCount: 5,
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
  updatedBy: "a@etsa.tech",
};

const verifiedRow = {
  found: true,
  row: {
    inPersonCount: record.inPersonCount,
    virtualCount: record.virtualCount,
  },
};

beforeEach(() => {
  process.env = {
    ...originalEnv,
    ATTENDANCE_SHEETS_WEBHOOK_URL: "https://script.example/attendance",
  };
  // First call is the doPost write, second is the doGet(?id=) verification
  // read-back - both need to resolve for a plain "happy path" test.
  global.fetch = jest
    .fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    .mockResolvedValue({
      ok: true,
      json: async () => verifiedRow,
    }) as unknown as typeof fetch;
});

afterEach(() => {
  process.env = originalEnv;
  global.fetch = originalFetch;
  jest.clearAllMocks();
});

describe("isAttendanceSheetsConfigured", () => {
  it("is true when ATTENDANCE_SHEETS_WEBHOOK_URL is set", () => {
    expect(isAttendanceSheetsConfigured()).toBe(true);
  });

  it("is false when ATTENDANCE_SHEETS_WEBHOOK_URL is blank", () => {
    process.env.ATTENDANCE_SHEETS_WEBHOOK_URL = undefined;
    expect(isAttendanceSheetsConfigured()).toBe(false);
  });
});

describe("syncAttendanceRecordToSheets", () => {
  it("posts the record fields to the webhook, then verifies by reading the row back", async () => {
    await syncAttendanceRecordToSheets(record);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://script.example/attendance",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body).toEqual(record);

    expect(global.fetch).toHaveBeenCalledWith(
      `https://script.example/attendance?id=${record.id}`,
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("throws when the webhook URL isn't configured", async () => {
    process.env.ATTENDANCE_SHEETS_WEBHOOK_URL = undefined;
    await expect(syncAttendanceRecordToSheets(record)).rejects.toThrow(
      "Attendance Sheets webhook URL not configured",
    );
  });

  it("throws when the webhook returns a non-ok response", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;
    await expect(syncAttendanceRecordToSheets(record)).rejects.toThrow(
      "Attendance Sheets webhook returned 500",
    );
  });

  it("throws when the webhook responds with an error payload", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ error: "bad row" }),
    }) as unknown as typeof fetch;
    await expect(syncAttendanceRecordToSheets(record)).rejects.toThrow(
      "bad row",
    );
  });

  it("throws when verification can't find the row (e.g. an older deployment without doGet(?id=))", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValue({
        ok: true,
        json: async () => ({ found: false }),
      }) as unknown as typeof fetch;
    await expect(syncAttendanceRecordToSheets(record)).rejects.toThrow(
      "row not found after write",
    );
  });

  it("throws when the verified row's counts don't match (concurrent write collision)", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          found: true,
          row: { inPersonCount: 999, virtualCount: record.virtualCount },
        }),
      }) as unknown as typeof fetch;
    await expect(syncAttendanceRecordToSheets(record)).rejects.toThrow(
      "doesn't match",
    );
  });

  it("throws when found: true is missing its row payload", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValue({
        ok: true,
        json: async () => ({ found: true }),
      }) as unknown as typeof fetch;
    await expect(syncAttendanceRecordToSheets(record)).rejects.toThrow(
      "doesn't match",
    );
  });

  it("throws when the verification read-back returns a non-ok response", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;
    await expect(syncAttendanceRecordToSheets(record)).rejects.toThrow(
      "Attendance Sheets verification returned 500",
    );
  });
});

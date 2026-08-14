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

beforeEach(() => {
  process.env = {
    ...originalEnv,
    ATTENDANCE_SHEETS_WEBHOOK_URL: "https://script.example/attendance",
  };
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({}),
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
  it("posts the record fields to the webhook", async () => {
    await syncAttendanceRecordToSheets(record);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://script.example/attendance",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body).toEqual(record);
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
});

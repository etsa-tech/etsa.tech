const blobStore = new Map<string, unknown>();

jest.mock("@netlify/blobs", () => ({
  getStore: jest.fn(() => ({
    get: jest.fn(async (key: string) => blobStore.get(key) ?? null),
    setJSON: jest.fn(async (key: string, value: unknown) => {
      blobStore.set(key, value);
    }),
    delete: jest.fn(async (key: string) => {
      blobStore.delete(key);
    }),
    list: jest.fn(async () => ({
      blobs: Array.from(blobStore.keys()).map((key) => ({ key })),
    })),
  })),
}));

const mockedSync = jest.fn();
jest.mock("@/lib/attendance-sheets-sync", () => ({
  syncAttendanceRecordToSheets: (...args: unknown[]) => mockedSync(...args),
}));

import {
  deleteAttendanceRecord,
  getAttendanceRecord,
  getAttendanceRecordByPostSlug,
  listAttendanceRecords,
  saveAttendanceRecord,
} from "@/lib/attendance-store";
import { AttendanceRecord } from "@/types/attendance";

function makeRecord(
  id: string,
  eventDate: string,
  overrides: Partial<AttendanceRecord> = {},
): AttendanceRecord {
  return {
    id,
    eventDate,
    postSlug: "slug",
    eventTitle: "Title",
    format: "hybrid",
    inPersonCount: 10,
    virtualCount: 5,
    createdAt: eventDate,
    updatedAt: eventDate,
    updatedBy: null,
    ...overrides,
  };
}

beforeEach(() => {
  blobStore.clear();
  mockedSync.mockReset();
  mockedSync.mockResolvedValue(undefined);
});

describe("listAttendanceRecords", () => {
  it("returns an empty array when the store is empty", async () => {
    expect(await listAttendanceRecords()).toEqual([]);
  });

  it("returns records sorted newest event date first", async () => {
    await saveAttendanceRecord(makeRecord("a", "2024-01-01"));
    await saveAttendanceRecord(makeRecord("b", "2025-01-01"));

    const records = await listAttendanceRecords();
    expect(records.map((r) => r.id)).toEqual(["b", "a"]);
  });
});

describe("getAttendanceRecord", () => {
  it("returns null when not found", async () => {
    expect(await getAttendanceRecord("missing")).toBeNull();
  });

  it("returns the saved record", async () => {
    await saveAttendanceRecord(makeRecord("a", "2024-01-01"));
    expect(await getAttendanceRecord("a")).toEqual(
      makeRecord("a", "2024-01-01"),
    );
  });
});

describe("getAttendanceRecordByPostSlug", () => {
  it("returns null when no record links to that post", async () => {
    expect(await getAttendanceRecordByPostSlug("no-such-post")).toBeNull();
  });

  it("returns the record whose postSlug matches", async () => {
    await saveAttendanceRecord(
      makeRecord("a", "2024-01-01", { postSlug: "post-a" }),
    );
    await saveAttendanceRecord(
      makeRecord("b", "2024-02-01", { postSlug: "post-b" }),
    );

    const found = await getAttendanceRecordByPostSlug("post-b");
    expect(found?.id).toBe("b");
  });
});

describe("saveAttendanceRecord", () => {
  it("writes to Blobs and mirrors to Sheets", async () => {
    const result = await saveAttendanceRecord(makeRecord("a", "2024-01-01"));
    expect(result.record).toEqual(makeRecord("a", "2024-01-01"));
    expect(mockedSync).toHaveBeenCalledWith(makeRecord("a", "2024-01-01"));
  });

  it("throws when the Blobs write fails, even if Sheets succeeds", async () => {
    const { getStore } = jest.requireMock("@netlify/blobs");
    getStore.mockReturnValueOnce({
      setJSON: jest.fn().mockRejectedValue(new Error("blobs down")),
      get: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
      list: jest.fn(),
    });

    await expect(
      saveAttendanceRecord(makeRecord("a", "2024-01-01")),
    ).rejects.toThrow("blobs down");
  });

  it("rolls back a new record (deletes it from Blobs) when the Sheets mirror fails", async () => {
    mockedSync.mockRejectedValue(new Error("sheets down"));
    await expect(
      saveAttendanceRecord(makeRecord("a", "2024-01-01")),
    ).rejects.toThrow("sheets down");
    expect(await getAttendanceRecord("a")).toBeNull();
  });

  it("restores the previous version of an edited record when the Sheets mirror fails", async () => {
    const original = makeRecord("a", "2024-01-01", { inPersonCount: 10 });
    await saveAttendanceRecord(original);

    mockedSync.mockRejectedValue(new Error("sheets down"));
    const updated = { ...original, inPersonCount: 999 };
    await expect(saveAttendanceRecord(updated, original)).rejects.toThrow(
      "sheets down",
    );

    expect(await getAttendanceRecord("a")).toEqual(original);
  });
});

describe("deleteAttendanceRecord", () => {
  it("removes the record from Blobs only - it never touches Sheets", async () => {
    const record = makeRecord("a", "2024-01-01");
    await saveAttendanceRecord(record);
    mockedSync.mockClear();

    await deleteAttendanceRecord(record.id);
    expect(mockedSync).not.toHaveBeenCalled();
    expect(await getAttendanceRecord("a")).toBeNull();
  });

  it("is unaffected by Sheets sync failures, since it never calls it", async () => {
    const record = makeRecord("a", "2024-01-01");
    await saveAttendanceRecord(record);
    mockedSync.mockRejectedValue(new Error("sheets down"));

    await expect(deleteAttendanceRecord(record.id)).resolves.toBeUndefined();
    expect(await getAttendanceRecord("a")).toBeNull();
  });
});

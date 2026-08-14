import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import { isAttendanceSheetsConfigured } from "@/lib/attendance-sheets-sync";
import {
  getAttendanceRecordByPostSlug,
  listAttendanceRecords,
  saveAttendanceRecord,
} from "@/lib/attendance-store";
import { GET, POST } from "../route";

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth", () => ({ authOptions: {} }));
jest.mock("@/lib/auth-utils", () => ({ isAuthorizedUser: jest.fn() }));
jest.mock("@/lib/attendance-sheets-sync", () => ({
  isAttendanceSheetsConfigured: jest.fn(),
}));
jest.mock("@/lib/attendance-store", () => ({
  getAttendanceRecordByPostSlug: jest.fn(),
  listAttendanceRecords: jest.fn(),
  saveAttendanceRecord: jest.fn(),
}));
jest.mock("node:crypto", () => ({ randomUUID: () => "generated-id" }));

const mockedGetServerSession = jest.mocked(getServerSession);
const mockedIsAuthorizedUser = jest.mocked(isAuthorizedUser);
const mockedIsAttendanceSheetsConfigured = jest.mocked(
  isAttendanceSheetsConfigured,
);
const mockedGetAttendanceRecordByPostSlug = jest.mocked(
  getAttendanceRecordByPostSlug,
);
const mockedListAttendanceRecords = jest.mocked(listAttendanceRecords);
const mockedSaveAttendanceRecord = jest.mocked(saveAttendanceRecord);

const validInput = {
  eventDate: "2025-01-01",
  postSlug: "2025-01-01-some-event",
  eventTitle: "Some Event",
  format: "hybrid" as const,
  inPersonCount: 10,
  virtualCount: 4,
};

function postReq(body: unknown) {
  return new NextRequest("http://localhost/api/admin/attendance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockedGetServerSession.mockResolvedValue({
    user: { email: "board@etsa.tech" },
  } as never);
  mockedIsAuthorizedUser.mockReturnValue(true);
  mockedIsAttendanceSheetsConfigured.mockReturnValue(false);
  mockedGetAttendanceRecordByPostSlug.mockResolvedValue(null);
});

afterEach(() => jest.clearAllMocks());

describe("GET /api/admin/attendance", () => {
  it("returns the record list plus canDelete: true when the Sheets webhook isn't configured", async () => {
    mockedListAttendanceRecords.mockResolvedValue([]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.records).toEqual([]);
    expect(body.canDelete).toBe(true);
  });

  it("reports canDelete: false when the Sheets webhook is configured", async () => {
    mockedIsAttendanceSheetsConfigured.mockReturnValue(true);
    mockedListAttendanceRecords.mockResolvedValue([]);
    const res = await GET();
    expect((await res.json()).canDelete).toBe(false);
  });

  it("401s for an unauthorized user", async () => {
    mockedIsAuthorizedUser.mockReturnValue(false);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("500s when listing fails", async () => {
    mockedListAttendanceRecords.mockRejectedValue(new Error("blobs down"));
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

describe("POST /api/admin/attendance", () => {
  it("creates a record with a generated id and the session email", async () => {
    mockedSaveAttendanceRecord.mockResolvedValue({
      record: { id: "generated-id", ...validInput } as never,
    });

    const res = await POST(postReq(validInput));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.record.id).toBe("generated-id");
    expect(mockedSaveAttendanceRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "generated-id",
        ...validInput,
        updatedBy: "board@etsa.tech",
      }),
    );
  });

  it("updates the existing record instead of creating a duplicate when a record for the postSlug already exists", async () => {
    const existing = {
      id: "existing-id",
      ...validInput,
      inPersonCount: 1,
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
      updatedBy: null,
    };
    mockedGetAttendanceRecordByPostSlug.mockResolvedValue(existing as never);
    mockedSaveAttendanceRecord.mockResolvedValue({
      record: { ...existing, ...validInput } as never,
    });

    const res = await POST(postReq(validInput));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.record.id).toBe("existing-id");
    expect(mockedSaveAttendanceRecord).toHaveBeenCalledWith(
      expect.objectContaining({ id: "existing-id", ...validInput }),
      existing,
    );
  });

  it("401s for an unauthorized user", async () => {
    mockedIsAuthorizedUser.mockReturnValue(false);
    const res = await POST(postReq(validInput));
    expect(res.status).toBe(401);
  });

  it("400s for an invalid body", async () => {
    const res = await POST(postReq({ ...validInput, postSlug: "" }));
    expect(res.status).toBe(400);
    expect(mockedSaveAttendanceRecord).not.toHaveBeenCalled();
  });

  it("500s with the underlying error when saving fails (e.g. the Sheets mirror)", async () => {
    mockedSaveAttendanceRecord.mockRejectedValue(new Error("sheets down"));
    const res = await POST(postReq(validInput));
    expect(res.status).toBe(500);
    expect((await res.json()).details).toBe("sheets down");
  });
});

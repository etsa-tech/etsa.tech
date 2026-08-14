import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import { isAttendanceSheetsConfigured } from "@/lib/attendance-sheets-sync";
import {
  deleteAttendanceRecord,
  getAttendanceRecord,
  saveAttendanceRecord,
} from "@/lib/attendance-store";
import { DELETE, GET, PUT } from "../route";

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth", () => ({ authOptions: {} }));
jest.mock("@/lib/auth-utils", () => ({ isAuthorizedUser: jest.fn() }));
jest.mock("@/lib/attendance-sheets-sync", () => ({
  isAttendanceSheetsConfigured: jest.fn(),
}));
jest.mock("@/lib/attendance-store", () => ({
  getAttendanceRecord: jest.fn(),
  saveAttendanceRecord: jest.fn(),
  deleteAttendanceRecord: jest.fn(),
}));

const mockedGetServerSession = jest.mocked(getServerSession);
const mockedIsAuthorizedUser = jest.mocked(isAuthorizedUser);
const mockedIsAttendanceSheetsConfigured = jest.mocked(
  isAttendanceSheetsConfigured,
);
const mockedGetAttendanceRecord = jest.mocked(getAttendanceRecord);
const mockedSaveAttendanceRecord = jest.mocked(saveAttendanceRecord);
const mockedDeleteAttendanceRecord = jest.mocked(deleteAttendanceRecord);

const existingRecord = {
  id: "a",
  eventDate: "2025-01-01",
  postSlug: "2025-01-01-some-event",
  eventTitle: "Some Event",
  format: "hybrid" as const,
  inPersonCount: 10,
  virtualCount: 4,
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
  updatedBy: null,
};

const validInput = {
  eventDate: "2025-02-01",
  postSlug: "2025-02-01-other-event",
  eventTitle: "Other Event",
  format: "virtual" as const,
  inPersonCount: 0,
  virtualCount: 20,
};

function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function req(method: string, body?: unknown) {
  return new NextRequest(`http://localhost/api/admin/attendance/a`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  mockedGetServerSession.mockResolvedValue({
    user: { email: "board@etsa.tech" },
  } as never);
  mockedIsAuthorizedUser.mockReturnValue(true);
  // Not configured -> "local" -> delete allowed, matching the default in
  // most tests below.
  mockedIsAttendanceSheetsConfigured.mockReturnValue(false);
  mockedGetAttendanceRecord.mockResolvedValue(existingRecord);
});

afterEach(() => jest.clearAllMocks());

describe("GET /api/admin/attendance/[id]", () => {
  it("returns the record", async () => {
    const res = await GET(req("GET"), routeParams("a"));
    expect(res.status).toBe(200);
    expect((await res.json()).record).toEqual(existingRecord);
  });

  it("401s for an unauthorized user", async () => {
    mockedIsAuthorizedUser.mockReturnValue(false);
    const res = await GET(req("GET"), routeParams("a"));
    expect(res.status).toBe(401);
  });

  it("404s when not found", async () => {
    mockedGetAttendanceRecord.mockResolvedValue(null);
    const res = await GET(req("GET"), routeParams("missing"));
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/admin/attendance/[id]", () => {
  it("updates the record, keeping its id and refreshing updatedAt/updatedBy", async () => {
    mockedSaveAttendanceRecord.mockResolvedValue({
      record: { ...existingRecord, ...validInput },
    });

    const res = await PUT(req("PUT", validInput), routeParams("a"));
    expect(res.status).toBe(200);
    expect(mockedSaveAttendanceRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "a",
        ...validInput,
        updatedBy: "board@etsa.tech",
      }),
      existingRecord,
    );
  });

  it("401s for an unauthorized user", async () => {
    mockedIsAuthorizedUser.mockReturnValue(false);
    const res = await PUT(req("PUT", validInput), routeParams("a"));
    expect(res.status).toBe(401);
  });

  it("404s when the record doesn't exist", async () => {
    mockedGetAttendanceRecord.mockResolvedValue(null);
    const res = await PUT(req("PUT", validInput), routeParams("missing"));
    expect(res.status).toBe(404);
  });

  it("400s for an invalid body", async () => {
    const res = await PUT(
      req("PUT", { ...validInput, inPersonCount: -1 }),
      routeParams("a"),
    );
    expect(res.status).toBe(400);
    expect(mockedSaveAttendanceRecord).not.toHaveBeenCalled();
  });

  it("500s with the underlying error when saving fails (e.g. the Sheets mirror)", async () => {
    mockedSaveAttendanceRecord.mockRejectedValue(new Error("sheets down"));
    const res = await PUT(req("PUT", validInput), routeParams("a"));
    expect(res.status).toBe(500);
    expect((await res.json()).details).toBe("sheets down");
  });
});

describe("DELETE /api/admin/attendance/[id]", () => {
  it("deletes the record by id when the Sheets webhook isn't configured", async () => {
    mockedDeleteAttendanceRecord.mockResolvedValue(undefined);
    const res = await DELETE(req("DELETE"), routeParams("a"));
    expect(res.status).toBe(200);
    expect(mockedDeleteAttendanceRecord).toHaveBeenCalledWith("a");
  });

  it("401s for an unauthorized user", async () => {
    mockedIsAuthorizedUser.mockReturnValue(false);
    const res = await DELETE(req("DELETE"), routeParams("a"));
    expect(res.status).toBe(401);
  });

  it("403s when the Sheets webhook is configured (deployed), without touching the store", async () => {
    mockedIsAttendanceSheetsConfigured.mockReturnValue(true);
    const res = await DELETE(req("DELETE"), routeParams("a"));
    expect(res.status).toBe(403);
    expect(mockedGetAttendanceRecord).not.toHaveBeenCalled();
    expect(mockedDeleteAttendanceRecord).not.toHaveBeenCalled();
  });

  it("404s when the record doesn't exist", async () => {
    mockedGetAttendanceRecord.mockResolvedValue(null);
    const res = await DELETE(req("DELETE"), routeParams("missing"));
    expect(res.status).toBe(404);
  });

  it("500s with the underlying error when deletion fails", async () => {
    mockedDeleteAttendanceRecord.mockRejectedValue(new Error("blobs down"));
    const res = await DELETE(req("DELETE"), routeParams("a"));
    expect(res.status).toBe(500);
    expect((await res.json()).details).toBe("blobs down");
  });
});

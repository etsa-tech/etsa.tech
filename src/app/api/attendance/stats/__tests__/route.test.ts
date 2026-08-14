import { listAttendanceRecords } from "@/lib/attendance-store";
import { GET } from "../route";

jest.mock("@/lib/attendance-store", () => ({
  listAttendanceRecords: jest.fn(),
}));

const mockedListAttendanceRecords = jest.mocked(listAttendanceRecords);

afterEach(() => jest.clearAllMocks());

describe("GET /api/attendance/stats", () => {
  it("returns only computed aggregates, never raw records", async () => {
    mockedListAttendanceRecords.mockResolvedValue([
      {
        id: "a",
        eventDate: "2025-01-01",
        postSlug: "slug",
        eventTitle: "Title",
        format: "hybrid",
        inPersonCount: 10,
        virtualCount: 4,
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
        updatedBy: null,
      },
    ]);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      overall: expect.objectContaining({ totalEvents: 1 }),
      yearly: expect.any(Array),
    });
    expect(JSON.stringify(body)).not.toContain("postSlug");
    expect(JSON.stringify(body)).not.toContain("eventTitle");
  });

  it("500s when loading records fails", async () => {
    mockedListAttendanceRecords.mockRejectedValue(new Error("blobs down"));
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

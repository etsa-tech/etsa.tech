import { getServerSession } from "next-auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import { getAllPosts, getPostSpeakers } from "@/lib/blog";
import { listAttendanceRecords } from "@/lib/attendance-store";
import { AttendanceRecord } from "@/types/attendance";
import { GET } from "../route";

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth", () => ({ authOptions: {} }));
jest.mock("@/lib/auth-utils", () => ({ isAuthorizedUser: jest.fn() }));
jest.mock("@/lib/blog", () => ({
  getAllPosts: jest.fn(),
  getPostSpeakers: jest.fn(),
}));
jest.mock("@/lib/attendance-store", () => ({
  listAttendanceRecords: jest.fn(),
}));

const mockedGetServerSession = jest.mocked(getServerSession);
const mockedIsAuthorizedUser = jest.mocked(isAuthorizedUser);
const mockedGetAllPosts = jest.mocked(getAllPosts);
const mockedGetPostSpeakers = jest.mocked(getPostSpeakers);
const mockedListAttendanceRecords = jest.mocked(listAttendanceRecords);

beforeEach(() => {
  mockedGetServerSession.mockResolvedValue({
    user: { email: "board@etsa.tech" },
  } as never);
  mockedIsAuthorizedUser.mockReturnValue(true);
});

afterEach(() => jest.clearAllMocks());

describe("GET /api/admin/attendance/speakers", () => {
  it("joins attendance records to posts by slug and returns per-speaker stats", async () => {
    const record: AttendanceRecord = {
      id: "1",
      eventDate: "2025-01-01",
      postSlug: "a",
      eventTitle: "A Talk",
      format: "hybrid",
      inPersonCount: 10,
      virtualCount: 4,
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
      updatedBy: null,
    };
    mockedListAttendanceRecords.mockResolvedValue([record]);
    mockedGetAllPosts.mockReturnValue([
      { slug: "a", frontmatter: { title: "A Talk" }, readingTime: 1 },
    ] as never);
    mockedGetPostSpeakers.mockReturnValue([{ name: "Jane Doe" }] as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.speakers).toEqual([
      {
        speakerName: "Jane Doe",
        eventCount: 1,
        avgTotal: 14,
        avgInPerson: 10,
        avgVirtual: 4,
        records: [record],
      },
    ]);
  });

  it("401s for an unauthorized user", async () => {
    mockedIsAuthorizedUser.mockReturnValue(false);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("500s when listing records fails", async () => {
    mockedListAttendanceRecords.mockRejectedValue(new Error("blobs down"));
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

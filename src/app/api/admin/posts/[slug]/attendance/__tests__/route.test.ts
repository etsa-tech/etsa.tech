import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import { getAllPosts } from "@/lib/blog";
import { getAttendanceRecordByPostSlug } from "@/lib/attendance-store";
import { GET } from "../route";

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth", () => ({ authOptions: {} }));
jest.mock("@/lib/auth-utils", () => ({ isAuthorizedUser: jest.fn() }));
jest.mock("@/lib/blog", () => ({ getAllPosts: jest.fn() }));
jest.mock("@/lib/attendance-store", () => ({
  getAttendanceRecordByPostSlug: jest.fn(),
}));

const mockedGetServerSession = jest.mocked(getServerSession);
const mockedIsAuthorizedUser = jest.mocked(isAuthorizedUser);
const mockedGetAllPosts = jest.mocked(getAllPosts);
const mockedGetAttendanceRecordByPostSlug = jest.mocked(
  getAttendanceRecordByPostSlug,
);

function routeParams(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

function req() {
  return new NextRequest("http://localhost/api/admin/posts/a/attendance");
}

beforeEach(() => {
  mockedGetServerSession.mockResolvedValue({
    user: { email: "board@etsa.tech" },
  } as never);
  mockedIsAuthorizedUser.mockReturnValue(true);
  mockedGetAllPosts.mockReturnValue([
    {
      slug: "a",
      frontmatter: { title: "A Talk", date: "2025-01-01" },
      readingTime: 1,
    },
  ] as never);
});

afterEach(() => jest.clearAllMocks());

describe("GET /api/admin/posts/[slug]/attendance", () => {
  it("returns the post's title/date plus its attendance record", async () => {
    mockedGetAttendanceRecordByPostSlug.mockResolvedValue({
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
    });

    const res = await GET(req(), routeParams("a"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.postTitle).toBe("A Talk");
    expect(body.record.id).toBe("1");
  });

  it("returns a null record when the post has no attendance recorded yet", async () => {
    mockedGetAttendanceRecordByPostSlug.mockResolvedValue(null);
    const res = await GET(req(), routeParams("a"));
    expect((await res.json()).record).toBeNull();
  });

  it("401s for an unauthorized user", async () => {
    mockedIsAuthorizedUser.mockReturnValue(false);
    const res = await GET(req(), routeParams("a"));
    expect(res.status).toBe(401);
  });

  it("404s when the post doesn't exist", async () => {
    mockedGetAllPosts.mockReturnValue([]);
    const res = await GET(req(), routeParams("missing"));
    expect(res.status).toBe(404);
  });
});

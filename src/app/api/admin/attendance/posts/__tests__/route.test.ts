import { getServerSession } from "next-auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import { getAllPosts } from "@/lib/blog";
import { GET } from "../route";

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth", () => ({ authOptions: {} }));
jest.mock("@/lib/auth-utils", () => ({ isAuthorizedUser: jest.fn() }));
jest.mock("@/lib/blog", () => ({ getAllPosts: jest.fn() }));

const mockedGetServerSession = jest.mocked(getServerSession);
const mockedIsAuthorizedUser = jest.mocked(isAuthorizedUser);
const mockedGetAllPosts = jest.mocked(getAllPosts);

beforeEach(() => {
  mockedGetServerSession.mockResolvedValue({
    user: { email: "board@etsa.tech" },
  } as never);
  mockedIsAuthorizedUser.mockReturnValue(true);
});

afterEach(() => jest.clearAllMocks());

describe("GET /api/admin/attendance/posts", () => {
  it("returns a slug/title/date summary for each post", async () => {
    mockedGetAllPosts.mockReturnValue([
      {
        slug: "a",
        frontmatter: { title: "A", date: "2025-01-01" },
        readingTime: 1,
      },
    ] as never);

    const res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).posts).toEqual([
      { slug: "a", title: "A", date: "2025-01-01" },
    ]);
  });

  it("401s for an unauthorized user", async () => {
    mockedIsAuthorizedUser.mockReturnValue(false);
    const res = await GET();
    expect(res.status).toBe(401);
  });
});

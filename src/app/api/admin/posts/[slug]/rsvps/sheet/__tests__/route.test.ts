import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import { getBlogPost } from "@/lib/github";
import { getSheetRsvpsForEvent } from "@/lib/google-sheets-read";
import { GET } from "../route";

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth", () => ({ authOptions: {} }));
jest.mock("@/lib/auth-utils", () => ({ isAuthorizedUser: jest.fn() }));
jest.mock("@/lib/github", () => ({ getBlogPost: jest.fn() }));
jest.mock("@/lib/google-sheets-read", () => ({
  getSheetRsvpsForEvent: jest.fn(),
}));

const mockedGetServerSession = jest.mocked(getServerSession);
const mockedIsAuthorizedUser = jest.mocked(isAuthorizedUser);
const mockedGetBlogPost = jest.mocked(getBlogPost);
const mockedGetSheetRsvpsForEvent = jest.mocked(getSheetRsvpsForEvent);

function ctx(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

beforeEach(() => {
  mockedGetServerSession.mockResolvedValue({
    user: { email: "a@etsa.tech" },
  } as never);
  mockedIsAuthorizedUser.mockReturnValue(true);
});

afterEach(() => jest.clearAllMocks());

describe("GET /api/admin/posts/[slug]/rsvps/sheet", () => {
  it("returns sheet rows for the post's title", async () => {
    mockedGetBlogPost.mockResolvedValue('---\ntitle: "My Event"\n---\nbody');
    mockedGetSheetRsvpsForEvent.mockResolvedValue([
      {
        firstName: "A",
        lastName: "B",
        email: "a@b.com",
        canAttend: "Yes",
        timestamp: "t",
        comments: "",
      },
    ]);
    const res = await GET(new NextRequest("http://localhost/x"), ctx("slug"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.postTitle).toBe("My Event");
    expect(body.sheet.rows).toHaveLength(1);
    expect(body.sheet.error).toBeNull();
    expect(mockedGetSheetRsvpsForEvent).toHaveBeenCalledWith("My Event");
  });

  it("defaults the title to an empty string when frontmatter has none", async () => {
    mockedGetBlogPost.mockResolvedValue("---\n---\nbody");
    mockedGetSheetRsvpsForEvent.mockResolvedValue([]);
    const res = await GET(new NextRequest("http://localhost/x"), ctx("slug"));
    expect((await res.json()).postTitle).toBe("");
  });

  it("reports an error message when no rows are found", async () => {
    mockedGetBlogPost.mockResolvedValue('---\ntitle: "My Event"\n---\nbody');
    mockedGetSheetRsvpsForEvent.mockResolvedValue([]);
    const res = await GET(new NextRequest("http://localhost/x"), ctx("slug"));
    expect((await res.json()).sheet.error).toMatch(/No Google Sheet RSVPs/);
  });

  it("401s for an unauthorized user", async () => {
    mockedIsAuthorizedUser.mockReturnValue(false);
    const res = await GET(new NextRequest("http://localhost/x"), ctx("slug"));
    expect(res.status).toBe(401);
  });

  it("500s when getBlogPost throws", async () => {
    mockedGetBlogPost.mockRejectedValue(new Error("not found"));
    const res = await GET(new NextRequest("http://localhost/x"), ctx("slug"));
    expect(res.status).toBe(500);
  });
});

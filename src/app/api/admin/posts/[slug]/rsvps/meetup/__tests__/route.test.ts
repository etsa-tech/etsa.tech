import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import { getBlogPost } from "@/lib/github";
import { getMeetupRsvpCount, findMeetupEventByTitle } from "@/lib/meetup";
import { GET } from "../route";

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth", () => ({ authOptions: {} }));
jest.mock("@/lib/auth-utils", () => ({ isAuthorizedUser: jest.fn() }));
jest.mock("@/lib/github", () => ({ getBlogPost: jest.fn() }));
jest.mock("@/lib/meetup", () => ({
  getMeetupRsvpCount: jest.fn(),
  findMeetupEventByTitle: jest.fn(),
}));

const mockedGetServerSession = jest.mocked(getServerSession);
const mockedIsAuthorizedUser = jest.mocked(isAuthorizedUser);
const mockedGetBlogPost = jest.mocked(getBlogPost);
const mockedGetMeetupRsvpCount = jest.mocked(getMeetupRsvpCount);
const mockedFindMeetupEventByTitle = jest.mocked(findMeetupEventByTitle);

const originalEnv = process.env;

function ctx(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

function req(query = "") {
  return new NextRequest(`http://localhost/x${query}`);
}

beforeEach(() => {
  process.env = { ...originalEnv, MEETUP_GROUP_SLUG: "my-group" };
  mockedGetServerSession.mockResolvedValue({
    user: { email: "a@etsa.tech" },
  } as never);
  mockedIsAuthorizedUser.mockReturnValue(true);
});

afterEach(() => {
  process.env = originalEnv;
  jest.clearAllMocks();
});

describe("GET /api/admin/posts/[slug]/rsvps/meetup", () => {
  it("looks up by a stored meetupEventId from frontmatter", async () => {
    mockedGetBlogPost.mockResolvedValue(
      '---\ntitle: "My Event"\nmeetupEventId: "123"\n---\nbody',
    );
    mockedGetMeetupRsvpCount.mockResolvedValue({
      count: 5,
      title: "My Event",
      dateTime: "2026-01-01",
      sampleAttendeeNames: ["Sam"],
    });

    const res = await GET(req(), ctx("slug"));
    const body = await res.json();
    expect(body.meetup.eventId).toBe("123");
    expect(body.meetup.matchedByTitle).toBe(false);
    expect(body.meetup.eventUrl).toBe(
      "https://www.meetup.com/my-group/events/123/",
    );
    expect(mockedFindMeetupEventByTitle).not.toHaveBeenCalled();
  });

  it("prefers an explicit eventId query param over the stored one", async () => {
    mockedGetBlogPost.mockResolvedValue(
      '---\ntitle: "My Event"\nmeetupEventId: "stored"\n---\nbody',
    );
    mockedGetMeetupRsvpCount.mockResolvedValue({
      count: 1,
      title: "x",
      dateTime: "x",
      sampleAttendeeNames: [],
    });

    await GET(req("?eventId=query-id"), ctx("slug"));
    expect(mockedGetMeetupRsvpCount).toHaveBeenCalledWith("query-id");
  });

  it("falls back to a title search when there's no stored event ID", async () => {
    mockedGetBlogPost.mockResolvedValue('---\ntitle: "My Event"\n---\nbody');
    mockedFindMeetupEventByTitle.mockResolvedValue({
      id: "found-1",
      title: "My Event",
      dateTime: "2026-01-01",
      count: 3,
      sampleAttendeeNames: [],
    });

    const res = await GET(req(), ctx("slug"));
    const body = await res.json();
    expect(body.meetup.matchedByTitle).toBe(true);
    expect(body.meetup.eventId).toBe("found-1");
  });

  it("reports an unavailable error when a stored ID yields no data", async () => {
    mockedGetBlogPost.mockResolvedValue(
      '---\ntitle: "My Event"\nmeetupEventId: "123"\n---\nbody',
    );
    mockedGetMeetupRsvpCount.mockResolvedValue(null);

    const res = await GET(req(), ctx("slug"));
    expect((await res.json()).meetup.error).toBe("Meetup data unavailable");
  });

  it("reports no-match error and null eventUrls when title search finds nothing", async () => {
    process.env.MEETUP_GROUP_SLUG = undefined;
    mockedGetBlogPost.mockResolvedValue('---\ntitle: "My Event"\n---\nbody');
    mockedFindMeetupEventByTitle.mockResolvedValue(null);

    const res = await GET(req(), ctx("slug"));
    const body = await res.json();
    expect(body.meetup.error).toMatch(/No matching Meetup event/);
    expect(body.meetup.eventUrl).toBeNull();
  });

  it("falls back to an empty title and null URLs when frontmatter has no title and no group slug is configured", async () => {
    process.env.MEETUP_GROUP_SLUG = undefined;
    mockedGetBlogPost.mockResolvedValue('---\nmeetupEventId: "123"\n---\nbody');
    mockedGetMeetupRsvpCount.mockResolvedValue({
      count: 5,
      title: "My Event",
      dateTime: "2026-01-01",
      sampleAttendeeNames: ["Sam"],
    });

    const res = await GET(req(), ctx("slug"));
    const body = await res.json();
    expect(body.postTitle).toBe("");
    expect(body.meetup.eventId).toBe("123");
    expect(body.meetup.eventUrl).toBeNull();
    expect(body.meetup.attendeesUrl).toBeNull();
  });

  it("401s for an unauthorized user", async () => {
    mockedIsAuthorizedUser.mockReturnValue(false);
    const res = await GET(req(), ctx("slug"));
    expect(res.status).toBe(401);
  });

  it("500s when getBlogPost throws", async () => {
    mockedGetBlogPost.mockRejectedValue(new Error("not found"));
    const res = await GET(req(), ctx("slug"));
    expect(res.status).toBe(500);
  });
});

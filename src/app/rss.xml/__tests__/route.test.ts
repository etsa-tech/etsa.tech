import { getAllPosts } from "@/lib/blog";
import { GET } from "../route";

jest.mock("@/lib/blog", () => ({ getAllPosts: jest.fn() }));

const mockedGetAllPosts = jest.mocked(getAllPosts);

afterEach(() => jest.clearAllMocks());

function post(overrides: Record<string, unknown>) {
  return {
    slug: "my-talk",
    readingTime: 1,
    frontmatter: {
      title: "My Talk",
      date: "2026-01-01",
      excerpt: "An excerpt",
      tags: ["react"],
      ...overrides,
    },
  };
}

describe("GET /rss.xml", () => {
  it("includes items for each post with escaped description content", async () => {
    mockedGetAllPosts.mockReturnValue([
      post({ speakerName: "Jane & Co", excerpt: 'Learn <html> "quoting"' }),
    ] as never);
    const res = await GET();
    expect(res.headers.get("Content-Type")).toContain("application/rss+xml");
    const body = await res.text();
    expect(body).toContain("<title><![CDATA[My Talk]]></title>");
    expect(body).toContain("Speaker: Jane &amp; Co");
    expect(body).toContain("&lt;html&gt;");
    expect(body).toContain("&quot;quoting&quot;");
    expect(body).toContain("<category><![CDATA[react]]></category>");
  });

  it("includes speaker title and company in the description when both are present", async () => {
    mockedGetAllPosts.mockReturnValue([
      post({
        speakerName: "Jane Doe",
        speakerTitle: "CTO",
        speakerCompany: "Acme",
      }),
    ] as never);
    const res = await GET();
    const body = await res.text();
    expect(body).toContain("Speaker: Jane Doe (CTO at Acme)");
  });

  it("uses the multi-speaker array and defaults author to ETSA when no speaker is present", async () => {
    mockedGetAllPosts.mockReturnValue([
      post({
        speakerName: undefined,
        speakers: [
          { name: "Amy Zhou", title: "CTO", company: "Acme" },
          { name: "Sam Lee" },
        ],
      }),
    ] as never);
    const res = await GET();
    const body = await res.text();
    expect(body).toContain("Speakers: Amy Zhou (CTO at Acme), Sam Lee");
    expect(body).toContain("author>info@etsa.tech (Amy Zhou, Sam Lee)");
  });

  it("defaults the author to ETSA and omits speaker info when there's no speaker at all", async () => {
    mockedGetAllPosts.mockReturnValue([
      post({ speakerName: undefined, speakers: undefined }),
    ] as never);
    const res = await GET();
    const body = await res.text();
    expect(body).toContain("author>info@etsa.tech (ETSA)");
    expect(body).not.toContain("Speaker:");
  });

  it("limits the feed to the 10 most recent posts", async () => {
    mockedGetAllPosts.mockReturnValue(
      Array.from({ length: 15 }, (_, i) =>
        post({ title: `Post ${i}` }),
      ) as never,
    );
    const res = await GET();
    const body = await res.text();
    expect(body.match(/<item>/g)).toHaveLength(10);
  });

  it("500s when getAllPosts throws", async () => {
    mockedGetAllPosts.mockImplementation(() => {
      throw new Error("fs error");
    });
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

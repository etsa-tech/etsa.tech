import { getAllPosts } from "@/lib/blog";
import sitemap from "@/app/sitemap";

jest.mock("@/lib/blog", () => ({ getAllPosts: jest.fn() }));

const mockedGetAllPosts = jest.mocked(getAllPosts);
const originalEnv = process.env;

afterEach(() => {
  process.env = originalEnv;
});

describe("sitemap", () => {
  it("uses NEXT_PUBLIC_SITE_URL when set", () => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SITE_URL: "https://example.com",
    };
    mockedGetAllPosts.mockReturnValue([]);
    const entries = sitemap();
    expect(entries[0].url).toBe("https://example.com");
  });

  it("falls back to https://etsa.tech when NEXT_PUBLIC_SITE_URL is unset", () => {
    process.env = { ...originalEnv, NEXT_PUBLIC_SITE_URL: undefined };
    mockedGetAllPosts.mockReturnValue([]);
    const entries = sitemap();
    expect(entries[0].url).toBe("https://etsa.tech");
  });

  it("includes all static pages", () => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SITE_URL: "https://example.com",
    };
    mockedGetAllPosts.mockReturnValue([]);
    const urls = sitemap().map((e) => e.url);
    expect(urls).toEqual([
      "https://example.com",
      "https://example.com/presentations",
      "https://example.com/speakers",
      "https://example.com/tags",
      "https://example.com/about",
      "https://example.com/contact",
      "https://example.com/rsvp",
      "https://example.com/rss.xml",
      "https://example.com/robots.txt",
      "https://example.com/humans.txt",
      "https://example.com/.well-known/security.txt",
    ]);
  });

  it("appends a dynamic entry per post, using getPostUrl for the path", () => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SITE_URL: "https://example.com",
    };
    mockedGetAllPosts.mockReturnValue([
      {
        slug: "my-post",
        readingTime: 1,
        frontmatter: {
          title: "My Post",
          date: "2026-01-15",
          excerpt: "e",
          tags: [],
          author: "a",
          blogpost: true,
        },
      },
    ]);
    const entries = sitemap();
    const postEntry = entries[entries.length - 1];
    expect(postEntry.url).toBe("https://example.com/blog/my-post");
    expect(postEntry.lastModified).toEqual(new Date("2026-01-15"));
  });
});

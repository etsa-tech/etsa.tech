import { getAllPosts } from "@/lib/blog";
import sitemap from "@/app/sitemap";

jest.mock("@/lib/blog", () => ({ getAllPosts: jest.fn() }));

const mockedGetAllPosts = jest.mocked(getAllPosts);
const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv, NEXT_PUBLIC_SITE_URL: "https://etsa.tech" };
});

afterEach(() => {
  process.env = originalEnv;
  jest.clearAllMocks();
});

describe("sitemap", () => {
  it("includes static pages and one entry per post", () => {
    mockedGetAllPosts.mockReturnValue([
      {
        slug: "my-talk",
        readingTime: 1,
        frontmatter: {
          title: "x",
          date: "2026-01-01",
          excerpt: "e",
          tags: [],
        } as never,
      },
    ]);
    const result = sitemap();
    expect(result.some((e) => e.url === "https://etsa.tech")).toBe(true);
    expect(
      result.some((e) => e.url === "https://etsa.tech/presentation/my-talk"),
    ).toBe(true);
    expect(result.some((e) => e.url === "https://etsa.tech/privacy")).toBe(
      true,
    );
  });

  it("returns only static pages when there are no posts", () => {
    mockedGetAllPosts.mockReturnValue([]);
    const result = sitemap();
    expect(
      result.every(
        (e) => !e.url.includes("/presentation/") && !e.url.includes("/blog/"),
      ),
    ).toBe(true);
  });

  it("falls back to the default site URL when NEXT_PUBLIC_SITE_URL is unset", () => {
    process.env.NEXT_PUBLIC_SITE_URL = undefined;
    mockedGetAllPosts.mockReturnValue([]);
    const result = sitemap();
    expect(result.some((e) => e.url === "https://etsa.tech")).toBe(true);
  });
});

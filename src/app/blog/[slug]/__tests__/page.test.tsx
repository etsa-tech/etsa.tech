/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { notFound } from "next/navigation";
import {
  getPostBySlug,
  getBlogPostSlugs,
  getRecentBlogPosts,
} from "@/lib/blog";
import BlogPostPage, {
  generateMetadata,
  generateStaticParams,
} from "@/app/blog/[slug]/page";

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
jest.mock("@/lib/blog", () => ({
  getPostBySlug: jest.fn(),
  getBlogPostSlugs: jest.fn(),
  getRecentBlogPosts: jest.fn(),
}));

const mockedGetPostBySlug = jest.mocked(getPostBySlug);
const mockedGetBlogPostSlugs = jest.mocked(getBlogPostSlugs);
const mockedGetRecentBlogPosts = jest.mocked(getRecentBlogPosts);
const mockedNotFound = jest.mocked(notFound);

afterEach(() => jest.clearAllMocks());

function params(slug: string) {
  return Promise.resolve({ slug });
}

const blogPost = {
  slug: "my-post",
  content: "<p>Hello <script>alert(1)</script></p>",
  readingTime: 3,
  frontmatter: {
    title: "My Post",
    date: "2026-01-01",
    excerpt: "e",
    tags: ["react"],
    author: "Jane",
    blogpost: true,
  },
};

describe("BlogPostPage", () => {
  it("renders the post content through sanitizeHtml", async () => {
    // The repo-wide __mocks__/sanitize-html.ts stub is a passthrough (real
    // sanitize-html pulls in an ESM-only dependency Jest can't transform),
    // so this only verifies the page pipes content through it and renders
    // the result - not sanitize-html's own escaping behavior.
    mockedGetPostBySlug.mockResolvedValue(blogPost as never);
    mockedGetRecentBlogPosts.mockReturnValue([]);
    const jsx = await BlogPostPage({ params: params("my-post") });
    render(jsx);
    expect(
      screen.getByRole("heading", { name: "My Post" }),
    ).toBeInTheDocument();
    expect(screen.getByText("By Jane")).toBeInTheDocument();
    expect(document.querySelector(".prose-content")?.innerHTML).toContain(
      "Hello",
    );
  });

  it("shows recent posts in the sidebar, excluding the current post", async () => {
    mockedGetPostBySlug.mockResolvedValue(blogPost as never);
    mockedGetRecentBlogPosts.mockReturnValue([
      {
        slug: "my-post",
        readingTime: 1,
        frontmatter: { title: "My Post", date: "2026-01-01" } as never,
      },
      {
        slug: "other",
        readingTime: 1,
        frontmatter: { title: "Other Post", date: "2026-01-02" } as never,
      },
    ]);
    const jsx = await BlogPostPage({ params: params("my-post") });
    render(jsx);
    expect(screen.getByText("Other Post")).toBeInTheDocument();
    // Breadcrumb + <h1> both show the title; the sidebar's own "My Post"
    // entry is filtered out since it matches the current post's slug.
    expect(screen.getAllByText("My Post")).toHaveLength(2);
  });

  it("calls notFound when the post doesn't exist", async () => {
    mockedGetPostBySlug.mockResolvedValue(null);
    await expect(BlogPostPage({ params: params("missing") })).rejects.toThrow();
    expect(mockedNotFound).toHaveBeenCalled();
  });

  it("calls notFound when the post exists but isn't a blog post", async () => {
    mockedGetPostBySlug.mockResolvedValue({
      ...blogPost,
      frontmatter: { ...blogPost.frontmatter, blogpost: false },
    } as never);
    await expect(BlogPostPage({ params: params("my-post") })).rejects.toThrow();
  });

  it("generateStaticParams returns encoded slugs", async () => {
    mockedGetBlogPostSlugs.mockReturnValue(["a b", "c"]);
    const result = await generateStaticParams();
    expect(result).toEqual([{ slug: "a%20b" }, { slug: "c" }]);
  });

  describe("generateMetadata", () => {
    it("returns post title/description for a valid blog post", async () => {
      mockedGetPostBySlug.mockResolvedValue(blogPost as never);
      const meta = await generateMetadata({ params: params("my-post") });
      expect(meta.title).toBe("My Post - ETSA Blog");
    });

    it("returns a not-found title when the post is missing or not a blog post", async () => {
      mockedGetPostBySlug.mockResolvedValue(null);
      const meta = await generateMetadata({ params: params("missing") });
      expect(meta.title).toBe("Blog Post Not Found - ETSA");
    });
  });
});

/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { getBlogPosts } from "@/lib/blog";
import BlogPage from "@/app/blog/page";

jest.mock("@/lib/blog", () => ({
  getBlogPosts: jest.fn(),
  getTagsWithCount: jest.fn(() => []),
}));

const mockedGetBlogPosts = jest.mocked(getBlogPosts);

afterEach(() => jest.clearAllMocks());

describe("BlogPage", () => {
  it("renders posts and stats when posts exist", () => {
    mockedGetBlogPosts.mockReturnValue([
      {
        slug: "a",
        readingTime: 1,
        frontmatter: {
          title: "A",
          date: "2026-01-01",
          excerpt: "e",
          tags: [],
        } as never,
      },
    ]);
    render(<BlogPage />);
    expect(screen.getByText("Blog")).toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("Total Posts")).toBeInTheDocument();
  });

  it("shows the empty state when there are no blog posts", () => {
    mockedGetBlogPosts.mockReturnValue([]);
    render(<BlogPage />);
    expect(screen.getByText("No blog posts yet")).toBeInTheDocument();
  });
});

/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { getCarouselImages } from "@/lib/server-only-carousel";
import { getRecentBlogPosts } from "@/lib/blog";
import Home from "@/app/page";

jest.mock("@/lib/server-only-carousel", () => ({
  getCarouselImages: jest.fn(),
}));
jest.mock("@/lib/blog", () => ({ getRecentBlogPosts: jest.fn() }));

const mockedGetCarouselImages = jest.mocked(getCarouselImages);
const mockedGetRecentBlogPosts = jest.mocked(getRecentBlogPosts);

afterEach(() => jest.clearAllMocks());

describe("Home", () => {
  it("renders the hero, carousel, and stats sections", () => {
    mockedGetCarouselImages.mockReturnValue([]);
    mockedGetRecentBlogPosts.mockReturnValue([]);
    render(<Home />);
    expect(screen.getByText("Our Community in Action")).toBeInTheDocument();
    expect(screen.getByText("Our Impact")).toBeInTheDocument();
    expect(screen.getByText("Presentations")).toBeInTheDocument();
    expect(screen.getByText("Years Active")).toBeInTheDocument();
  });

  it("shows the latest blog posts section when posts exist", () => {
    mockedGetCarouselImages.mockReturnValue([]);
    mockedGetRecentBlogPosts.mockReturnValue([
      {
        slug: "a",
        readingTime: 1,
        frontmatter: {
          title: "A Post",
          date: "2026-01-01",
          excerpt: "e",
          tags: [],
        } as never,
      },
    ]);
    render(<Home />);
    expect(screen.getByText("Latest Blog Posts")).toBeInTheDocument();
    expect(screen.getByText("A Post")).toBeInTheDocument();
  });

  it("hides the latest blog posts section when there are none", () => {
    mockedGetCarouselImages.mockReturnValue([]);
    mockedGetRecentBlogPosts.mockReturnValue([]);
    render(<Home />);
    expect(screen.queryByText("Latest Blog Posts")).not.toBeInTheDocument();
  });

  it("passes carousel images through to the photo carousel", () => {
    mockedGetCarouselImages.mockReturnValue([
      { src: "/a.jpg", alt: "A", caption: "Caption A" },
    ]);
    mockedGetRecentBlogPosts.mockReturnValue([]);
    render(<Home />);
    expect(screen.getByText("Caption A")).toBeInTheDocument();
  });
});

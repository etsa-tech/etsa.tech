/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import {
  getPresentationPosts,
  getAllTags,
  getAllSpeakers,
  getBlogPosts,
} from "@/lib/blog";
import PresentationsPage from "@/app/presentations/page";

jest.mock("@/lib/blog", () => ({
  getPresentationPosts: jest.fn(),
  getAllTags: jest.fn(),
  getAllSpeakers: jest.fn(),
  getBlogPosts: jest.fn(),
  getTagsWithCount: jest.fn(() => []),
}));

const mockedGetPresentationPosts = jest.mocked(getPresentationPosts);
const mockedGetAllTags = jest.mocked(getAllTags);
const mockedGetAllSpeakers = jest.mocked(getAllSpeakers);
const mockedGetBlogPosts = jest.mocked(getBlogPosts);

afterEach(() => jest.clearAllMocks());

describe("PresentationsPage", () => {
  it("renders presentation stats and the search component", () => {
    mockedGetPresentationPosts.mockReturnValue([
      {
        slug: "a",
        readingTime: 1,
        frontmatter: {
          title: "A Talk",
          date: "2026-01-01",
          excerpt: "e",
          tags: [],
        } as never,
      },
    ]);
    mockedGetAllTags.mockReturnValue(["react"]);
    mockedGetAllSpeakers.mockReturnValue(["Jane"]);
    mockedGetBlogPosts.mockReturnValue([]);

    render(<PresentationsPage />);
    expect(screen.getByText("Presentations")).toBeInTheDocument();
    expect(screen.getByText("Total Presentations")).toBeInTheDocument();
    expect(screen.getByText("A Talk")).toBeInTheDocument();
  });
});

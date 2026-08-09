/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { getTagsWithCount } from "@/lib/blog";
import TagsPage from "@/app/tags/page";

jest.mock("@/lib/blog", () => ({ getTagsWithCount: jest.fn() }));

const mockedGetTagsWithCount = jest.mocked(getTagsWithCount);

afterEach(() => jest.clearAllMocks());

describe("TagsPage", () => {
  it("renders each tag with its count and a total", () => {
    mockedGetTagsWithCount.mockReturnValue([
      { tag: "react", count: 3 },
      { tag: "node", count: 1 },
    ]);
    render(<TagsPage />);
    expect(screen.getByText("2 total tags")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /react/ })).toHaveAttribute(
      "href",
      "/tag/react",
    );
  });

  it("renders zero tags gracefully", () => {
    mockedGetTagsWithCount.mockReturnValue([]);
    render(<TagsPage />);
    expect(screen.getByText("0 total tags")).toBeInTheDocument();
  });
});

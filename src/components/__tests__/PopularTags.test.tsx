/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { getTagsWithCount } from "@/lib/blog";
import PopularTags from "@/components/PopularTags";

jest.mock("@/lib/blog", () => ({ getTagsWithCount: jest.fn() }));

const mockedGetTagsWithCount = jest.mocked(getTagsWithCount);

describe("PopularTags", () => {
  it("renders nothing when there are no tags", () => {
    mockedGetTagsWithCount.mockReturnValue([]);
    const { container } = render(<PopularTags />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders each tag with its count", () => {
    mockedGetTagsWithCount.mockReturnValue([
      { tag: "react", count: 5 },
      { tag: "node", count: 3 },
    ]);
    render(<PopularTags />);
    expect(screen.getByText("react")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("shows the 'View All Tags' link by default", () => {
    mockedGetTagsWithCount.mockReturnValue([{ tag: "react", count: 1 }]);
    render(<PopularTags />);
    expect(
      screen.getByRole("link", { name: /View All Tags/ }),
    ).toBeInTheDocument();
  });

  it("hides the view-all link when showViewAll is false", () => {
    mockedGetTagsWithCount.mockReturnValue([{ tag: "react", count: 1 }]);
    render(<PopularTags showViewAll={false} />);
    expect(
      screen.queryByRole("link", { name: /View All Tags/ }),
    ).not.toBeInTheDocument();
  });

  it("shows a 'showing N most popular' footer when the tag list hits the limit", () => {
    mockedGetTagsWithCount.mockReturnValue([
      { tag: "a", count: 1 },
      { tag: "b", count: 1 },
    ]);
    render(<PopularTags limit={2} />);
    expect(screen.getByText(/Showing 2 most popular tags/)).toBeInTheDocument();
  });
});

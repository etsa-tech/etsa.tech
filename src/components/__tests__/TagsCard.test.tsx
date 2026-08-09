/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { TagsCard } from "@/components/TagsCard";

jest.mock("@/components/PopularTags", () => ({
  __esModule: true,
  default: ({
    limit,
    showViewAll,
  }: {
    limit?: number;
    showViewAll?: boolean;
  }) => (
    <div data-testid="popular-tags">
      {limit}-{String(showViewAll)}
    </div>
  ),
}));

describe("TagsCard", () => {
  it("renders the title and passes props through to PopularTags", () => {
    render(<TagsCard title="Tags" limit={5} showViewAll />);
    expect(screen.getByText("Tags")).toBeInTheDocument();
    expect(screen.getByTestId("popular-tags")).toHaveTextContent("5-true");
  });

  it("defaults showViewAll to false when omitted", () => {
    render(<TagsCard title="Tags" />);
    expect(screen.getByTestId("popular-tags")).toHaveTextContent("-false");
  });
});

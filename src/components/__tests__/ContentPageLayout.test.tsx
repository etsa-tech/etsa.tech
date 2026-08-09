/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { ContentPageLayout } from "@/components/ContentPageLayout";

describe("ContentPageLayout", () => {
  it("renders title, description, children, and sidebar", () => {
    render(
      <ContentPageLayout
        title="Blog"
        description="All posts"
        sidebar={<div>sidebar content</div>}
      >
        <div>main content</div>
      </ContentPageLayout>,
    );
    expect(screen.getByText("Blog")).toBeInTheDocument();
    expect(screen.getByText("All posts")).toBeInTheDocument();
    expect(screen.getByText("main content")).toBeInTheDocument();
    expect(screen.getByText("sidebar content")).toBeInTheDocument();
  });

  it("hides the empty state by default", () => {
    render(
      <ContentPageLayout
        title="Blog"
        description="All posts"
        sidebar={null}
        emptyState={<div>nothing to see</div>}
      >
        <div>content</div>
      </ContentPageLayout>,
    );
    expect(screen.queryByText("nothing to see")).not.toBeInTheDocument();
  });

  it("shows the empty state when showEmptyState is true", () => {
    render(
      <ContentPageLayout
        title="Blog"
        description="All posts"
        sidebar={null}
        emptyState={<div>nothing to see</div>}
        showEmptyState
      >
        <div>content</div>
      </ContentPageLayout>,
    );
    expect(screen.getByText("nothing to see")).toBeInTheDocument();
  });
});

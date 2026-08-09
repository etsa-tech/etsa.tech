/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { EmptyState } from "@/components/EmptyState";

describe("EmptyState", () => {
  it("renders icon, title, and description", () => {
    render(
      <EmptyState
        icon="🎤"
        title="Nothing here"
        description="Check back later"
      />,
    );
    expect(screen.getByText("🎤")).toBeInTheDocument();
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.getByText("Check back later")).toBeInTheDocument();
  });

  it("renders an action node when provided", () => {
    render(
      <EmptyState
        icon="🎤"
        title="Nothing"
        description="desc"
        action={<button>Do something</button>}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Do something" }),
    ).toBeInTheDocument();
  });

  it("omits the action wrapper when none is provided", () => {
    const { container } = render(
      <EmptyState icon="🎤" title="Nothing" description="desc" />,
    );
    expect(container.querySelectorAll("div").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

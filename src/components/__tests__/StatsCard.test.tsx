/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { StatsCard } from "@/components/StatsCard";

describe("StatsCard", () => {
  it("renders the title and each stat's label/value", () => {
    render(
      <StatsCard
        title="Overview"
        stats={[
          { label: "Posts", value: 10 },
          { label: "Speakers", value: "5+" },
        ]}
      />,
    );
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Posts")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("5+")).toBeInTheDocument();
  });

  it("renders nothing extra when stats is empty", () => {
    render(<StatsCard title="Overview" stats={[]} />);
    expect(screen.getByText("Overview")).toBeInTheDocument();
  });
});

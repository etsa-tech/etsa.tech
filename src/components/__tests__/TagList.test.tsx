/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { TagList, TagCloud } from "@/components/TagList";

describe("TagList", () => {
  it("renders nothing for an empty tag list", () => {
    const { container } = render(<TagList tags={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders each tag as a link", () => {
    render(<TagList tags={["react", "node"]} />);
    expect(screen.getByRole("link", { name: "react" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "node" })).toBeInTheDocument();
  });

  it("shows a count badge when showCount is true and a count exists", () => {
    render(<TagList tags={["react"]} showCount tagCounts={{ react: 5 }} />);
    expect(screen.getByText("(5)")).toBeInTheDocument();
  });

  it("marks the current tag visually distinct (no crash, renders link)", () => {
    render(<TagList tags={["react", "node"]} currentTag="react" />);
    expect(screen.getByRole("link", { name: "react" })).toBeInTheDocument();
  });
});

describe("TagCloud", () => {
  it("renders nothing for an empty tag list", () => {
    const { container } = render(<TagCloud tags={[]} tagCounts={{}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("sorts tags by count descending, then alphabetically", () => {
    render(
      <TagCloud tags={["b", "a", "c"]} tagCounts={{ a: 1, b: 5, c: 5 }} />,
    );
    const links = screen.getAllByRole("link").map((l) => l.textContent);
    // b and c tie at count 5 -> alphabetical (b, c), then a.
    expect(links[0]).toContain("b");
    expect(links[1]).toContain("c");
    expect(links[2]).toContain("a");
  });

  it("renders a tag with count 0 without throwing when it's missing from tagCounts", () => {
    render(<TagCloud tags={["x"]} tagCounts={{ y: 1 }} />);
    expect(screen.getByRole("link", { name: /x/ })).toBeInTheDocument();
  });

  it("falls back to 0 when comparing tags missing from tagCounts while sorting", () => {
    render(
      <TagCloud
        tags={["missing", "low", "high"]}
        tagCounts={{ low: 1, high: 5 }}
      />,
    );
    const links = screen.getAllByRole("link").map((l) => l.textContent);
    expect(links[0]).toContain("high");
    expect(links[2]).toContain("missing");
  });

  it("falls back to 0 when the second tag being compared is missing from tagCounts", () => {
    render(
      <TagCloud
        tags={["defined", "laterMissing"]}
        tagCounts={{ defined: 3 }}
      />,
    );
    const links = screen.getAllByRole("link").map((l) => l.textContent);
    expect(links[0]).toContain("defined");
    expect(links[1]).toContain("laterMissing");
  });

  it("scales tag size class by relative popularity and marks the active tag", () => {
    render(
      <TagCloud
        tags={["a", "b", "c", "d", "e"]}
        tagCounts={{ a: 0, b: 2, c: 5, d: 7, e: 9 }}
        currentTag="c"
      />,
    );
    expect(screen.getByRole("link", { name: /^e/ })).toHaveClass("text-lg");
    expect(screen.getByRole("link", { name: /^d/ })).toHaveClass("text-base");
    expect(screen.getByRole("link", { name: /^c/ })).toHaveClass("text-sm");
    expect(screen.getByRole("link", { name: /^a/ })).toHaveClass("text-xs");
    // isActive true branch
    expect(screen.getByRole("link", { name: /^c/ })).toHaveClass(
      "bg-primary-100",
    );
    // isActive false branch
    expect(screen.getByRole("link", { name: /^a/ })).toHaveClass(
      "bg-secondary-100",
    );
  });
});

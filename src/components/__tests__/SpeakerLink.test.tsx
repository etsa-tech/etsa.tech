/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { SpeakerLink, SpeakerList } from "@/components/SpeakerLink";

describe("SpeakerLink", () => {
  it("links to the speaker's page using their name as fallback content", () => {
    render(<SpeakerLink speakerName="Jane Doe" />);
    const link = screen.getByRole("link", { name: "Jane Doe" });
    expect(link).toHaveAttribute("href", "/speaker/jane-doe");
  });

  it("renders custom children instead of the speaker name", () => {
    render(<SpeakerLink speakerName="Jane Doe">Custom text</SpeakerLink>);
    expect(
      screen.getByRole("link", { name: "Custom text" }),
    ).toBeInTheDocument();
  });
});

describe("SpeakerList", () => {
  it("renders nothing for an empty speaker list", () => {
    const { container } = render(<SpeakerList speakers={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a single speaker with title and company", () => {
    render(
      <SpeakerList
        speakers={[{ name: "Jane", title: "Engineer", company: "Acme" }]}
      />,
    );
    expect(screen.getByText("(Engineer at Acme)")).toBeInTheDocument();
  });

  it("renders a title without a company", () => {
    render(<SpeakerList speakers={[{ name: "Jane", title: "Engineer" }]} />);
    expect(screen.getByText("(Engineer)")).toBeInTheDocument();
  });

  it("joins two speakers with 'and'", () => {
    render(
      <SpeakerList
        speakers={[{ name: "Jane" }, { name: "Amy" }]}
        showTitles={false}
      />,
    );
    expect(screen.getByText("and")).toBeInTheDocument();
  });

  it("joins three or more speakers with commas", () => {
    render(
      <SpeakerList
        speakers={[{ name: "Jane" }, { name: "Amy" }, { name: "Sam" }]}
        showTitles={false}
      />,
    );
    expect(screen.getAllByText(",")).toHaveLength(1);
    expect(screen.getByText("and")).toBeInTheDocument();
  });

  it("hides titles when showTitles is false even if present", () => {
    render(
      <SpeakerList
        speakers={[{ name: "Jane", title: "Engineer" }]}
        showTitles={false}
      />,
    );
    expect(screen.queryByText(/Engineer/)).not.toBeInTheDocument();
  });
});

/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { getPresentationPosts } from "@/lib/blog";
import RSVPPage from "@/app/rsvp/page";

jest.mock("@/lib/blog", () => ({ getPresentationPosts: jest.fn() }));
jest.mock("@hcaptcha/react-hcaptcha", () => ({
  __esModule: true,
  default: () => <div data-testid="hcaptcha" />,
}));

const mockedGetPresentationPosts = jest.mocked(getPresentationPosts);

afterEach(() => jest.clearAllMocks());

describe("RSVPPage", () => {
  it("shows the latest post's meeting details when posts exist", () => {
    mockedGetPresentationPosts.mockReturnValue([
      {
        slug: "a",
        readingTime: 1,
        frontmatter: {
          title: "January Meetup",
          date: "2026-01-01",
          excerpt: "e",
          tags: [],
          description: "Come learn things",
        } as never,
      },
    ]);
    render(<RSVPPage />);
    expect(screen.getByText("Next Meeting Details")).toBeInTheDocument();
    expect(screen.getByText("January Meetup")).toBeInTheDocument();
    expect(screen.getByText("Come learn things")).toBeInTheDocument();
  });

  it("falls back to defaults when there are no posts yet", () => {
    mockedGetPresentationPosts.mockReturnValue([]);
    render(<RSVPPage />);
    expect(screen.queryByText("Next Meeting Details")).not.toBeInTheDocument();
    // "Date: " and the value are separate text nodes/expressions within the
    // same <p>, so match on the element's full text content.
    expect(
      screen.getByText(
        (_, node) =>
          node?.tagName === "P" &&
          node.textContent === "Date: First Tuesday of each month at 7:00 PM",
      ),
    ).toBeInTheDocument();
  });
});

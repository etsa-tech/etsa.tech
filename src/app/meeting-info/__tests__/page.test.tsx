/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { getPresentationPosts } from "@/lib/blog";
import MeetingInfoPage from "@/app/meeting-info/page";

jest.mock("@/lib/blog", () => ({ getPresentationPosts: jest.fn() }));
jest.mock("@/components/GoogleMapEmbed", () => ({
  __esModule: true,
  default: ({ address }: { address: string }) => (
    <div data-testid="map">{address}</div>
  ),
}));

const mockedGetPresentationPosts = jest.mocked(getPresentationPosts);
const originalFetch = global.fetch;

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ embedUrl: "https://maps.example/x" }),
  }) as unknown as typeof fetch;
});

afterEach(() => {
  global.fetch = originalFetch;
  jest.clearAllMocks();
});

describe("MeetingInfoPage", () => {
  it("uses default location and date when there are no posts", () => {
    mockedGetPresentationPosts.mockReturnValue([]);
    render(<MeetingInfoPage />);
    expect(
      screen.getByText("Knoxville Entrepreneur Center"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("First Tuesday of each month at 7:00 PM"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("map")).toHaveTextContent(
      "17 Market Square SUITE 101, Knoxville, TN 37902",
    );
  });

  it("shows the latest post's details and speakers when available", () => {
    mockedGetPresentationPosts.mockReturnValue([
      {
        slug: "a",
        readingTime: 1,
        frontmatter: {
          title: "Great Talk",
          date: "2026-01-01",
          excerpt: "e",
          tags: [],
          eventDate: "2026-01-06",
          speakerName: "Jane Doe",
        } as never,
      },
    ]);
    render(<MeetingInfoPage />);
    expect(screen.getByText("January 6, 2026")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Great Talk/ })).toHaveAttribute(
      "href",
      "/presentation/a",
    );
    expect(screen.getByText(/Jane Doe/)).toBeInTheDocument();
  });

  it("pluralizes 'Speakers' when the latest post has more than one speaker", () => {
    mockedGetPresentationPosts.mockReturnValue([
      {
        slug: "a",
        readingTime: 1,
        frontmatter: {
          title: "Great Talk",
          date: "2026-01-01",
          excerpt: "e",
          tags: [],
          speakers: [{ name: "Jane Doe" }, { name: "John Roe" }],
        } as never,
      },
    ]);
    render(<MeetingInfoPage />);
    expect(screen.getByText(/^Speakers:/)).toBeInTheDocument();
  });

  it("shows 'Speaker: TBA' when the latest post has no speaker", () => {
    mockedGetPresentationPosts.mockReturnValue([
      {
        slug: "a",
        readingTime: 1,
        frontmatter: {
          title: "Great Talk",
          date: "2026-01-01",
          excerpt: "e",
          tags: [],
        } as never,
      },
    ]);
    render(<MeetingInfoPage />);
    expect(screen.getByText("Speaker: TBA")).toBeInTheDocument();
  });

  it("does not nest the speaker link inside the presentation card link", () => {
    mockedGetPresentationPosts.mockReturnValue([
      {
        slug: "a",
        readingTime: 1,
        frontmatter: {
          title: "Great Talk",
          date: "2026-01-01",
          excerpt: "e",
          tags: [],
          speakerName: "Jane Doe",
        } as never,
      },
    ]);
    render(<MeetingInfoPage />);
    const cardLink = screen.getByRole("link", { name: "Great Talk" });
    const speakerLink = screen.getByRole("link", { name: "Jane Doe" });
    expect(cardLink).not.toContainElement(speakerLink);
    expect(speakerLink).not.toContainElement(cardLink);
  });

  it("uses the event location from post frontmatter when present", () => {
    mockedGetPresentationPosts.mockReturnValue([
      {
        slug: "a",
        readingTime: 1,
        frontmatter: {
          title: "Great Talk",
          date: "2026-01-01",
          excerpt: "e",
          tags: [],
          eventLocation: {
            name: "Custom Venue",
            address: "123 Custom St",
          },
        } as never,
      },
    ]);
    render(<MeetingInfoPage />);
    expect(screen.getByText("Custom Venue")).toBeInTheDocument();
    // Appears once in the location card, once in the (mocked) map embed.
    expect(screen.getAllByText("123 Custom St").length).toBeGreaterThan(0);
    // Event location has no parking/accessibility/contact/description set.
    expect(screen.queryByText(/Parking:/)).not.toBeInTheDocument();
  });

  it("renders the optional prose fields an event location carries", () => {
    mockedGetPresentationPosts.mockReturnValue([
      {
        slug: "a",
        readingTime: 1,
        frontmatter: {
          title: "Great Talk",
          date: "2026-01-01",
          excerpt: "e",
          tags: [],
          eventLocation: {
            name: "Custom Venue",
            address: "123 Custom St",
            description: "A fine venue",
            parking: "Garage next door",
            accessibility: "Step-free entry",
            contact: "hello@example.com",
          },
        } as never,
      },
    ]);
    render(<MeetingInfoPage />);
    expect(screen.getByText("A fine venue")).toBeInTheDocument();
    expect(screen.getByText("Garage next door")).toBeInTheDocument();
    expect(screen.getByText("Step-free entry")).toBeInTheDocument();
    expect(screen.getByText("hello@example.com")).toBeInTheDocument();
  });

  it("falls back to the venue name as the address for a string event location", () => {
    mockedGetPresentationPosts.mockReturnValue([
      {
        slug: "a",
        readingTime: 1,
        frontmatter: {
          title: "Great Talk",
          date: "2026-01-01",
          excerpt: "e",
          tags: [],
          eventLocation: "Kerns Food Hall",
        } as never,
      },
    ]);
    render(<MeetingInfoPage />);
    expect(screen.getAllByText("Kerns Food Hall").length).toBeGreaterThan(0);
    expect(screen.getByTestId("map")).toHaveTextContent("Kerns Food Hall");
  });
});

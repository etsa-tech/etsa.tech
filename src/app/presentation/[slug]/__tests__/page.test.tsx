/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { notFound } from "next/navigation";
import {
  getPostBySlug,
  getPresentationPostSlugs,
  getRecentPresentationPosts,
} from "@/lib/blog";
import PresentationPage, {
  generateMetadata,
  generateStaticParams,
} from "@/app/presentation/[slug]/page";

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
jest.mock("@/lib/blog", () => ({
  getPostBySlug: jest.fn(),
  getPresentationPostSlugs: jest.fn(),
  getRecentPresentationPosts: jest.fn(),
}));

const mockedGetPostBySlug = jest.mocked(getPostBySlug);
const mockedGetPresentationPostSlugs = jest.mocked(getPresentationPostSlugs);
const mockedGetRecentPresentationPosts = jest.mocked(
  getRecentPresentationPosts,
);

afterEach(() => jest.clearAllMocks());

function params(slug: string) {
  return Promise.resolve({ slug });
}

function basePost(overrides: Record<string, unknown> = {}) {
  return {
    slug: "my-talk",
    content: "<p>Body</p>",
    readingTime: 4,
    frontmatter: {
      title: "My Talk",
      date: "2026-01-01",
      excerpt: "e",
      tags: ["react"],
      ...overrides,
    },
  };
}

describe("PresentationPage", () => {
  it("renders speaker info, resources, and content", async () => {
    mockedGetPostBySlug.mockResolvedValue(
      basePost({
        speakerName: "Jane Doe",
        speakerTitle: "Engineer",
        speakerCompany: "Acme",
        speakerBio: "Bio text",
        speakerLinkedIn: "https://linkedin.com/in/jane",
        presentationSlides: "slides.pdf",
        recordingUrl: "https://youtube.com/watch?v=abc",
        eventDate: "2026-02-01",
        eventLocation: "Downtown",
      }) as never,
    );
    mockedGetRecentPresentationPosts.mockReturnValue([]);
    const jsx = await PresentationPage({ params: params("my-talk") });
    render(jsx);

    expect(
      screen.getByRole("heading", { name: "My Talk" }),
    ).toBeInTheDocument();
    expect(screen.getByText("About the Speaker")).toBeInTheDocument();
    expect(screen.getByText(/Engineer/)).toBeInTheDocument();
    expect(screen.getByText("Bio text")).toBeInTheDocument();
    expect(screen.getByLabelText("LinkedIn")).toHaveAttribute(
      "href",
      "https://linkedin.com/in/jane",
    );
    expect(screen.getByText("Presentation Resources")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View Slides/ })).toHaveAttribute(
      "href",
      "/presentation/my-talk/slides.pdf",
    );
    expect(
      screen.getByRole("link", { name: /Watch Recording/ }),
    ).toHaveAttribute("href", "https://youtube.com/watch?v=abc");
    expect(screen.getByText(/Event:/)).toBeInTheDocument();
    expect(screen.getByText("Downtown")).toBeInTheDocument();
  });

  it("uses eventLocation.name when eventLocation is an object", async () => {
    mockedGetPostBySlug.mockResolvedValue(
      basePost({ eventLocation: { name: "Custom Venue" } }) as never,
    );
    mockedGetRecentPresentationPosts.mockReturnValue([]);
    const jsx = await PresentationPage({ params: params("my-talk") });
    render(jsx);
    expect(screen.getByText("Custom Venue")).toBeInTheDocument();
  });

  it("hides the speaker card and resources section when absent", async () => {
    mockedGetPostBySlug.mockResolvedValue(basePost() as never);
    mockedGetRecentPresentationPosts.mockReturnValue([]);
    const jsx = await PresentationPage({ params: params("my-talk") });
    render(jsx);
    expect(screen.queryByText(/About the Speaker/)).not.toBeInTheDocument();
    expect(
      screen.queryByText("Presentation Resources"),
    ).not.toBeInTheDocument();
  });

  it("shows recent presentations in the sidebar, excluding the current one", async () => {
    mockedGetPostBySlug.mockResolvedValue(basePost() as never);
    mockedGetRecentPresentationPosts.mockReturnValue([
      {
        slug: "my-talk",
        readingTime: 1,
        frontmatter: { title: "My Talk", date: "2026-01-01" } as never,
      },
      {
        slug: "other",
        readingTime: 1,
        frontmatter: { title: "Other Talk", date: "2026-01-02" } as never,
      },
    ]);
    const jsx = await PresentationPage({ params: params("my-talk") });
    render(jsx);
    expect(screen.getByText("Other Talk")).toBeInTheDocument();
  });

  it("calls notFound when the post doesn't exist", async () => {
    mockedGetPostBySlug.mockResolvedValue(null);
    await expect(
      PresentationPage({ params: params("missing") }),
    ).rejects.toThrow();
    expect(notFound).toHaveBeenCalled();
  });

  it("generateStaticParams returns encoded slugs", async () => {
    mockedGetPresentationPostSlugs.mockReturnValue(["a b"]);
    const result = await generateStaticParams();
    expect(result).toEqual([{ slug: "a%20b" }]);
  });

  describe("generateMetadata", () => {
    it("includes speaker authors when present", async () => {
      mockedGetPostBySlug.mockResolvedValue(
        basePost({ speakerName: "Jane Doe" }) as never,
      );
      const meta = await generateMetadata({ params: params("my-talk") });
      expect(meta.title).toBe("My Talk - ETSA");
      expect(meta.openGraph?.authors).toEqual(["Jane Doe"]);
    });

    it("returns a not-found title when the post is missing", async () => {
      mockedGetPostBySlug.mockResolvedValue(null);
      const meta = await generateMetadata({ params: params("missing") });
      expect(meta.title).toBe("Presentation Not Found - ETSA");
    });
  });
});

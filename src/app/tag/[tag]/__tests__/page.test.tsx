/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { notFound } from "next/navigation";
import { getPostsByTag, getAllTags } from "@/lib/blog";
import TagPage, {
  generateMetadata,
  generateStaticParams,
} from "@/app/tag/[tag]/page";

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
jest.mock("@/lib/blog", () => ({
  getPostsByTag: jest.fn(),
  getAllTags: jest.fn(),
}));

const mockedGetPostsByTag = jest.mocked(getPostsByTag);
const mockedGetAllTags = jest.mocked(getAllTags);

afterEach(() => jest.clearAllMocks());

function params(tag: string) {
  return Promise.resolve({ tag });
}

function post(slug: string, tags: string[]) {
  return {
    slug,
    readingTime: 1,
    frontmatter: {
      title: slug,
      date: "2026-01-01",
      excerpt: "e",
      tags,
    } as never,
  };
}

describe("TagPage", () => {
  it("renders posts for the tag and related tags by co-occurrence", async () => {
    mockedGetAllTags.mockReturnValue(["React", "Testing"]);
    mockedGetPostsByTag.mockReturnValue([
      post("a", ["React", "Testing"]),
      post("b", ["React", "Testing"]),
    ]);
    const jsx = await TagPage({ params: params("react") });
    render(jsx);
    expect(screen.getByText(/Posts tagged with "React"/)).toBeInTheDocument();
    expect(screen.getByText("2 presentations found")).toBeInTheDocument();
    expect(screen.getByText("Related Tags")).toBeInTheDocument();
    expect(screen.getByText("Testing (2)")).toBeInTheDocument();
  });

  it("sorts related tags by co-occurrence count when there are multiple candidates", async () => {
    mockedGetAllTags.mockReturnValue(["React", "Testing", "Docker"]);
    mockedGetPostsByTag.mockReturnValue([
      post("a", ["React", "Testing"]),
      post("b", ["React", "Testing"]),
      post("c", ["React", "Docker"]),
    ]);
    const jsx = await TagPage({ params: params("react") });
    render(jsx);
    expect(screen.getByText("Testing (2)")).toBeInTheDocument();
    expect(screen.getByText("Docker (1)")).toBeInTheDocument();
  });

  it("shows the empty state when the tag has no posts", async () => {
    mockedGetAllTags.mockReturnValue(["React"]);
    mockedGetPostsByTag.mockReturnValue([]);
    const jsx = await TagPage({ params: params("react") });
    render(jsx);
    expect(screen.getByText("No posts found")).toBeInTheDocument();
  });

  it("normalizes hyphens back to slashes for tags like CI/CD", async () => {
    mockedGetAllTags.mockReturnValue(["CI/CD"]);
    mockedGetPostsByTag.mockReturnValue([post("a", ["CI/CD"])]);
    const jsx = await TagPage({ params: params("ci-cd") });
    render(jsx);
    expect(screen.getByText(/Posts tagged with "CI\/CD"/)).toBeInTheDocument();
  });

  it("calls notFound for an unknown tag", async () => {
    mockedGetAllTags.mockReturnValue(["React"]);
    await expect(TagPage({ params: params("unknown") })).rejects.toThrow();
  });

  it("generateStaticParams slugifies tags with slashes and spaces", async () => {
    mockedGetAllTags.mockReturnValue(["CI/CD", "Web Development"]);
    const result = await generateStaticParams();
    expect(result).toEqual([{ tag: "ci-cd" }, { tag: "web%20development" }]);
  });

  describe("generateMetadata", () => {
    it("uses the canonical tag casing when found", async () => {
      mockedGetAllTags.mockReturnValue(["React"]);
      const meta = await generateMetadata({ params: params("react") });
      expect(meta.title).toBe("React Posts - ETSA");
    });

    it("falls back to the normalized tag when not found in the tag list", async () => {
      mockedGetAllTags.mockReturnValue([]);
      const meta = await generateMetadata({ params: params("mystery") });
      expect(meta.title).toBe("mystery Posts - ETSA");
    });
  });
});

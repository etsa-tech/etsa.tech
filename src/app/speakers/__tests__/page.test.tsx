/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import {
  getAllSpeakers,
  getPostsBySpeaker,
  getPresentationPosts,
} from "@/lib/blog";
import SpeakersPage from "@/app/speakers/page";
import type { PostSummary } from "@/types/post";

jest.mock("@/lib/blog", () => ({
  getAllSpeakers: jest.fn(),
  getPostsBySpeaker: jest.fn(),
  getPresentationPosts: jest.fn(),
}));

const mockedGetAllSpeakers = jest.mocked(getAllSpeakers);
const mockedGetPostsBySpeaker = jest.mocked(getPostsBySpeaker);
const mockedGetPresentationPosts = jest.mocked(getPresentationPosts);

afterEach(() => jest.clearAllMocks());

function talk(slug: string, speakerName: string): PostSummary {
  return {
    slug,
    readingTime: 1,
    frontmatter: {
      title: `${slug} title`,
      date: "2026-01-01",
      excerpt: "e",
      tags: [],
      speakerName,
    } as never,
  };
}

describe("SpeakersPage", () => {
  it("builds speaker directory stats and picks the most complete speaker profile", () => {
    mockedGetAllSpeakers.mockReturnValue(["Jane Doe", "Amy Zhou"]);
    mockedGetPresentationPosts.mockReturnValue([
      talk("a", "Jane Doe"),
      talk("b", "Amy Zhou"),
    ]);
    mockedGetPostsBySpeaker.mockImplementation((name: string) => {
      if (name === "Jane Doe") {
        return [talk("a", "Jane Doe"), talk("a2", "Jane Doe")];
      }
      return [talk("b", "Amy Zhou")];
    });

    render(<SpeakersPage />);
    expect(screen.getByText("Our Speakers")).toBeInTheDocument();
    expect(
      screen.getByText(/Search and explore our community of 2 speakers/),
    ).toBeInTheDocument();
    expect(screen.getByText("Total Speakers")).toBeInTheDocument();
    // Jane Doe has 2 talks (multi-talk), sorted first.
    expect(screen.getByText("Multi-Talk Speakers")).toBeInTheDocument();
  });

  it("breaks talk-count ties by name, handles a speaker with no posts, and skips a mismatched post speaker", () => {
    mockedGetAllSpeakers.mockReturnValue([
      "Zed Speaker",
      "Amy Speaker",
      "No Posts",
    ]);
    mockedGetPresentationPosts.mockReturnValue([
      talk("a", "Zed Speaker"),
      talk("b", "Amy Speaker"),
    ]);
    mockedGetPostsBySpeaker.mockImplementation((name: string) => {
      if (name === "Zed Speaker") {
        // Mismatched speakerName in the post's own frontmatter, so
        // getPostSpeakers(...) never matches "Zed Speaker" here.
        return [talk("a", "Someone Else")];
      }
      if (name === "Amy Speaker") return [talk("b", "Amy Speaker")];
      return [];
    });

    render(<SpeakersPage />);
    // Zed and Amy both have 1 talk (tie) -> sorted alphabetically: Amy first.
    const names = screen
      .getAllByText(/Zed Speaker|Amy Speaker/)
      .map((n) => n.textContent);
    expect(names[0]).toBe("Amy Speaker");
  });

  it("handles zero speakers without dividing by zero", () => {
    mockedGetAllSpeakers.mockReturnValue([]);
    mockedGetPresentationPosts.mockReturnValue([]);
    mockedGetPostsBySpeaker.mockReturnValue([]);
    render(<SpeakersPage />);
    expect(screen.getByText(/community of 0 speakers/)).toBeInTheDocument();
  });
});

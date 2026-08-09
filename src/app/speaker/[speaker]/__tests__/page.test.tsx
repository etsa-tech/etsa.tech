/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { notFound } from "next/navigation";
import { getAllSpeakers, getPostsBySpeaker } from "@/lib/blog";
import SpeakerPage, {
  generateMetadata,
  generateStaticParams,
} from "@/app/speaker/[speaker]/page";

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
jest.mock("@/lib/blog", () => ({
  getAllSpeakers: jest.fn(),
  getPostsBySpeaker: jest.fn(),
}));

const mockedGetAllSpeakers = jest.mocked(getAllSpeakers);
const mockedGetPostsBySpeaker = jest.mocked(getPostsBySpeaker);

afterEach(() => jest.clearAllMocks());

function params(speaker: string) {
  return Promise.resolve({ speaker });
}

function talk(slug: string) {
  return {
    slug,
    readingTime: 1,
    frontmatter: {
      title: slug,
      date: "2026-01-01",
      excerpt: "e",
      tags: [],
    } as never,
  };
}

describe("SpeakerPage", () => {
  it("renders the speaker's talks", async () => {
    mockedGetAllSpeakers.mockReturnValue(["Jane Doe"]);
    mockedGetPostsBySpeaker.mockReturnValue([talk("a"), talk("b")]);
    const jsx = await SpeakerPage({ params: params("jane-doe") });
    render(jsx);
    expect(
      screen.getByRole("heading", { name: "Jane Doe" }),
    ).toBeInTheDocument();
    expect(screen.getByText("2 presentations at ETSA")).toBeInTheDocument();
  });

  it("renders singular presentation text for a single talk", async () => {
    mockedGetAllSpeakers.mockReturnValue(["Jane Doe"]);
    mockedGetPostsBySpeaker.mockReturnValue([talk("a")]);
    const jsx = await SpeakerPage({ params: params("jane-doe") });
    render(jsx);
    expect(screen.getByText("1 presentation at ETSA")).toBeInTheDocument();
  });

  it("calls notFound for an unknown speaker", async () => {
    mockedGetAllSpeakers.mockReturnValue([]);
    await expect(SpeakerPage({ params: params("nobody") })).rejects.toThrow();
  });

  it("calls notFound when the speaker exists but has no posts", async () => {
    mockedGetAllSpeakers.mockReturnValue(["Jane Doe"]);
    mockedGetPostsBySpeaker.mockReturnValue([]);
    await expect(SpeakerPage({ params: params("jane-doe") })).rejects.toThrow();
  });

  it("generateStaticParams slugifies speaker names", async () => {
    mockedGetAllSpeakers.mockReturnValue(["Jane Doe"]);
    const result = await generateStaticParams();
    expect(result).toEqual([{ speaker: "jane-doe" }]);
  });

  describe("generateMetadata", () => {
    it("returns speaker-specific metadata when found", async () => {
      mockedGetAllSpeakers.mockReturnValue(["Jane Doe"]);
      mockedGetPostsBySpeaker.mockReturnValue([talk("a")]);
      const meta = await generateMetadata({ params: params("jane-doe") });
      expect(meta.title).toBe("Jane Doe - Speaker at ETSA");
    });

    it("returns a not-found title for an unknown speaker", async () => {
      mockedGetAllSpeakers.mockReturnValue([]);
      const meta = await generateMetadata({ params: params("nobody") });
      expect(meta.title).toBe("Speaker Not Found - ETSA");
    });

    it("pluralizes the description for multiple presentations", async () => {
      mockedGetAllSpeakers.mockReturnValue(["Jane Doe"]);
      mockedGetPostsBySpeaker.mockReturnValue([talk("a"), talk("b")]);
      const meta = await generateMetadata({ params: params("jane-doe") });
      expect(meta.description).toBe(
        "View all presentations by Jane Doe at ETSA meetups. 2 presentations available.",
      );
    });
  });
});

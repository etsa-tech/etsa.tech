import { composeLinkedInPost } from "@/lib/linkedin/compose";
import { getPublishedPostFrontmatter } from "@/lib/social/post-data";
import { getPostSpeakers, getSocialContentFields } from "@/lib/utils";
import { getSpeakerLinkedInUrn } from "@/lib/speaker-linkedin-store";

jest.mock("@/lib/linkedin/compose", () => ({ composeLinkedInPost: jest.fn() }));
jest.mock("@/lib/social/post-data", () => ({
  getPublishedPostFrontmatter: jest.fn(),
}));
jest.mock("@/lib/utils", () => ({
  getPostSpeakers: jest.fn(),
  getSocialContentFields: jest.fn(),
}));
jest.mock("@/lib/speaker-linkedin-store", () => ({
  getSpeakerLinkedInUrn: jest.fn(),
}));

import { buildDefaultLinkedInCommentary } from "@/lib/linkedin/default-commentary";

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getPublishedPostFrontmatter).mockResolvedValue({
    title: "My Talk",
  } as never);
  jest.mocked(getSocialContentFields).mockReturnValue({
    bio: "bio",
    date: "2026-01-01",
    abstract: "abstract",
    speakerName: "Jane Doe",
    company: "Acme",
  });
  jest
    .mocked(getPostSpeakers)
    .mockReturnValue([
      { name: "Jane Doe", linkedIn: "https://linkedin.com/in/jd" },
    ]);
  jest.mocked(getSpeakerLinkedInUrn).mockResolvedValue(null);
  jest.mocked(composeLinkedInPost).mockReturnValue("composed post text");
});

describe("buildDefaultLinkedInCommentary", () => {
  it("composes from the post's frontmatter and speaker", async () => {
    const result = await buildDefaultLinkedInCommentary("my-talk");
    expect(result).toBe("composed post text");
    expect(composeLinkedInPost).toHaveBeenCalledWith({
      title: "My Talk",
      abstract: "abstract",
      date: "2026-01-01",
      speakerName: "Jane Doe",
      company: "Acme",
      speakerLinkedInUrl: "https://linkedin.com/in/jd",
      speakerLinkedInUrn: undefined,
    });
  });

  it("prefers a manually-set frontmatter urn over the connect-flow store", async () => {
    jest.mocked(getPostSpeakers).mockReturnValue([
      {
        name: "Jane Doe",
        linkedIn: "https://linkedin.com/in/jd",
        linkedInUrn: "manual-urn",
      },
    ]);
    await buildDefaultLinkedInCommentary("my-talk");
    expect(composeLinkedInPost).toHaveBeenCalledWith(
      expect.objectContaining({ speakerLinkedInUrn: "manual-urn" }),
    );
    expect(getSpeakerLinkedInUrn).not.toHaveBeenCalled();
  });

  it("passes the speaker's captured urn through to the mention when connected", async () => {
    jest.mocked(getSpeakerLinkedInUrn).mockResolvedValue("member-999");
    await buildDefaultLinkedInCommentary("my-talk");
    expect(composeLinkedInPost).toHaveBeenCalledWith(
      expect.objectContaining({ speakerLinkedInUrn: "member-999" }),
    );
  });

  it("skips the speaker urn lookup when there's no speaker name", async () => {
    jest.mocked(getSocialContentFields).mockReturnValue({
      bio: "",
      date: "2026-01-01",
      abstract: "abstract",
      speakerName: "",
      company: "",
    });
    await buildDefaultLinkedInCommentary("my-talk");
    expect(getSpeakerLinkedInUrn).not.toHaveBeenCalled();
  });
});

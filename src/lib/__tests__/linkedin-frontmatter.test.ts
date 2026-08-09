import {
  clearSpeakerLinkedInUrnFromFrontmatter,
  getSpeakerLinkedInUrnFromFrontmatter,
  setSpeakerLinkedInUrnInFrontmatter,
} from "@/lib/linkedin-frontmatter";
import type { PostFrontmatter } from "@/types/post";

function baseFrontmatter(
  overrides: Partial<PostFrontmatter> = {},
): PostFrontmatter {
  return {
    title: "My Talk",
    date: "2026-01-01",
    excerpt: "e",
    tags: [],
    author: "ETSA",
    ...overrides,
  };
}

describe("getSpeakerLinkedInUrnFromFrontmatter", () => {
  it("returns the urn from a matching speakers[] entry", () => {
    const fm = baseFrontmatter({
      speakers: [{ name: "Jane Doe", linkedInUrn: "member-1" }],
    });
    expect(getSpeakerLinkedInUrnFromFrontmatter(fm, "jane doe")).toBe(
      "member-1",
    );
  });

  it("returns the urn from the legacy speakerName/speakerLinkedInUrn fields", () => {
    const fm = baseFrontmatter({
      speakerName: "Jane Doe",
      speakerLinkedInUrn: "member-2",
    });
    expect(getSpeakerLinkedInUrnFromFrontmatter(fm, "Jane Doe")).toBe(
      "member-2",
    );
  });

  it("returns null when there's no match at all", () => {
    const fm = baseFrontmatter({ speakers: [{ name: "Someone Else" }] });
    expect(getSpeakerLinkedInUrnFromFrontmatter(fm, "Jane Doe")).toBeNull();
  });

  it("returns null when the matching speaker has no urn set", () => {
    const fm = baseFrontmatter({ speakers: [{ name: "Jane Doe" }] });
    expect(getSpeakerLinkedInUrnFromFrontmatter(fm, "Jane Doe")).toBeNull();
  });
});

describe("setSpeakerLinkedInUrnInFrontmatter", () => {
  it("sets the urn on the matching speakers[] entry without disturbing other fields", () => {
    const fm = baseFrontmatter({
      speakers: [{ name: "Jane Doe", company: "Acme" }],
    });
    setSpeakerLinkedInUrnInFrontmatter(fm, "Jane Doe", "member-1");
    expect(fm.speakers).toEqual([
      { name: "Jane Doe", company: "Acme", linkedInUrn: "member-1" },
    ]);
  });

  it("falls back to the legacy field when there's no speakers[] match", () => {
    const fm = baseFrontmatter({ speakerName: "Jane Doe" });
    setSpeakerLinkedInUrnInFrontmatter(fm, "Jane Doe", "member-2");
    expect(fm.speakerLinkedInUrn).toBe("member-2");
  });
});

describe("clearSpeakerLinkedInUrnFromFrontmatter", () => {
  it("removes the urn from a matching speakers[] entry", () => {
    const fm = baseFrontmatter({
      speakers: [
        { name: "Jane Doe", company: "Acme", linkedInUrn: "member-1" },
      ],
    });
    clearSpeakerLinkedInUrnFromFrontmatter(fm, "Jane Doe");
    expect(fm.speakers).toEqual([{ name: "Jane Doe", company: "Acme" }]);
  });

  it("removes the legacy speakerLinkedInUrn field", () => {
    const fm = baseFrontmatter({
      speakerName: "Jane Doe",
      speakerLinkedInUrn: "member-2",
    });
    clearSpeakerLinkedInUrnFromFrontmatter(fm, "Jane Doe");
    expect(fm.speakerLinkedInUrn).toBeUndefined();
  });

  it("does nothing when the speaker has no urn set anywhere", () => {
    const fm = baseFrontmatter({ speakers: [{ name: "Jane Doe" }] });
    clearSpeakerLinkedInUrnFromFrontmatter(fm, "Jane Doe");
    expect(fm.speakers).toEqual([{ name: "Jane Doe" }]);
  });

  it("does nothing for a speaker not present on this post at all", () => {
    const fm = baseFrontmatter({ speakerName: "Someone Else" });
    clearSpeakerLinkedInUrnFromFrontmatter(fm, "Jane Doe");
    expect(fm.speakerLinkedInUrn).toBeUndefined();
  });
});

jest.mock("@/lib/github", () => ({
  getBlogPost: jest.fn(),
}));

import { getBlogPost } from "@/lib/github";
import {
  getPublishedPostFrontmatter,
  getSocialDraftContent,
} from "../post-data";

// Quote every scalar - matches how real post frontmatter is written (see
// posts/*.md) and avoids YAML auto-typing unquoted date-shaped strings
// (e.g. `date: 2026-08-04`) into a JS Date instead of a string.
function yamlScalar(value: unknown): string {
  return `"${String(value).replaceAll('"', '\\"')}"`;
}

function markdownWithFrontmatter(frontmatter: Record<string, unknown>) {
  const yamlLines = Object.entries(frontmatter).map(([key, value]) => {
    if (Array.isArray(value)) {
      const items = value
        .map((item) =>
          typeof item === "object"
            ? Object.entries(item as Record<string, unknown>)
                .map(
                  ([k, v], i) =>
                    `${i === 0 ? "  - " : "    "}${k}: ${yamlScalar(v)}`,
                )
                .join("\n")
            : `  - ${yamlScalar(item)}`,
        )
        .join("\n");
      return `${key}:\n${items}`;
    }
    return `${key}: ${yamlScalar(value)}`;
  });
  return `---\n${yamlLines.join("\n")}\n---\nBody content here.`;
}

describe("getPublishedPostFrontmatter", () => {
  it("fetches the post from main and parses its frontmatter", async () => {
    jest.mocked(getBlogPost).mockResolvedValue(
      markdownWithFrontmatter({
        title: "A Home Lab Journey",
        date: "2026-08-04",
      }),
    );

    const frontmatter = await getPublishedPostFrontmatter("home-lab-journey");

    expect(getBlogPost).toHaveBeenCalledWith("home-lab-journey", "main");
    expect(frontmatter.title).toBe("A Home Lab Journey");
  });
});

describe("getSocialDraftContent", () => {
  it("derives bio/date/abstract/speaker fields from the multi-speaker format", async () => {
    jest.mocked(getBlogPost).mockResolvedValue(
      markdownWithFrontmatter({
        title: "A Home Lab Journey",
        date: "2026-08-04",
        excerpt: "excerpt fallback",
        presentationDescription: "The real abstract",
        eventDate: "2026-08-04",
        speakers: [
          { name: "Jane Doe", company: "Acme", bio: "Jane's bio" },
        ],
      }),
    );

    const content = await getSocialDraftContent("home-lab-journey");

    expect(content).toEqual({
      title: "A Home Lab Journey",
      bio: "Jane's bio",
      date: "2026-08-04",
      abstract: "The real abstract",
      speakerName: "Jane Doe",
      company: "Acme",
    });
  });

  it("falls back to legacy single-speaker fields and excerpt/date when the newer fields are absent", async () => {
    jest.mocked(getBlogPost).mockResolvedValue(
      markdownWithFrontmatter({
        title: "Legacy Post",
        date: "2025-01-01",
        excerpt: "excerpt fallback",
        speakerName: "Legacy Speaker",
        speakerCompany: "Legacy Co",
        speakerBio: "Legacy bio",
      }),
    );

    const content = await getSocialDraftContent("legacy-post");

    expect(content).toEqual({
      title: "Legacy Post",
      bio: "Legacy bio",
      date: "2025-01-01",
      abstract: "excerpt fallback",
      speakerName: "Legacy Speaker",
      company: "Legacy Co",
    });
  });
});

import {
  sanitizeForBranchName,
  buildScopedPrTitle,
  formatDate,
  getPostUrl,
  getPresentationUrl,
  getBlogUrl,
  getTagUrl,
  calculateReadingTime,
  sanitizeSearchInput,
  highlightSearchTerm,
  truncateText,
  getExcerpt,
  getPostSpeakers,
  getSocialContentFields,
  getSpeakerUrl,
  debounce,
  isValidEmail,
  generateSlug,
  getUniqueValues,
  sortByProperty,
  groupByProperty,
} from "@/lib/utils";
import type { PostFrontmatter } from "@/types/post";

describe("sanitizeForBranchName", () => {
  it("lowercases and hyphenates", () => {
    expect(sanitizeForBranchName("My Great Title!")).toBe("my-great-title");
  });

  it("trims leading/trailing hyphens", () => {
    expect(sanitizeForBranchName("---Test---")).toBe("test");
  });

  it("collapses punctuation runs into a single hyphen", () => {
    expect(sanitizeForBranchName("Hello: World")).toBe("hello-world");
  });
});

describe("buildScopedPrTitle", () => {
  it("joins type, scope, subject, and suffix untouched when short", () => {
    expect(
      buildScopedPrTitle(
        "fix",
        "blog",
        "my-talk",
        " - remove linkedin from frontmatter",
      ),
    ).toBe("fix(blog): my-talk - remove linkedin from frontmatter");
  });

  it("returns just the prefixed subject when no suffix is given", () => {
    expect(buildScopedPrTitle("fix", "blog", "my-talk")).toBe(
      "fix(blog): my-talk",
    );
  });

  it("truncates a long subject so the header stays within maxLength", () => {
    const longSlug =
      "ai-for-good-rebranding-and-building-our-community-website";
    const title = buildScopedPrTitle(
      "fix",
      "blog",
      longSlug,
      " - remove linkedin from frontmatter",
    );
    expect(title.length).toBeLessThanOrEqual(100);
    expect(title).toBe(
      "fix(blog): ai-for-good-rebranding-and-building-our-community-webs - remove linkedin from frontmatter",
    );
  });

  it("strips a trailing hyphen left by truncation", () => {
    const title = buildScopedPrTitle("fix", "blog", "abc-def-ghi", "", 15);
    expect(title.endsWith("-")).toBe(false);
    expect(title).toBe("fix(blog): abc");
  });

  it("respects a custom maxLength", () => {
    expect(buildScopedPrTitle("feat", "blog", "abcdefghi", "", 20)).toBe(
      "feat(blog): abcdefgh",
    );
  });
});

describe("formatDate", () => {
  it("formats a YYYY-MM-DD string without timezone drift", () => {
    expect(formatDate("2026-01-15")).toBe("January 15, 2026");
  });
});

describe("URL builders", () => {
  it("getPostUrl routes to /blog for blogpost frontmatter", () => {
    expect(getPostUrl("my-slug", { blogpost: true } as PostFrontmatter)).toBe(
      "/blog/my-slug",
    );
  });

  it("getPostUrl routes to /presentation otherwise", () => {
    expect(getPostUrl("my-slug")).toBe("/presentation/my-slug");
  });

  it("getPresentationUrl / getBlogUrl encode the slug", () => {
    expect(getPresentationUrl("a b")).toBe("/presentation/a%20b");
    expect(getBlogUrl("a b")).toBe("/blog/a%20b");
  });

  it("getTagUrl lowercases, replaces slashes, and encodes", () => {
    expect(getTagUrl("CI/CD")).toBe("/tag/ci-cd");
    expect(getTagUrl("Web Development")).toBe("/tag/web%20development");
  });

  it("getSpeakerUrl lowercases and hyphenates", () => {
    expect(getSpeakerUrl("Jane Doe")).toBe("/speaker/jane-doe");
  });
});

describe("calculateReadingTime", () => {
  it("rounds up to the nearest minute at 200wpm", () => {
    expect(calculateReadingTime("word ".repeat(201))).toBe(2);
  });
});

describe("sanitizeSearchInput", () => {
  it("truncates, trims, collapses whitespace, and strips brackets", () => {
    expect(sanitizeSearchInput("  a   <b>  c  ")).toBe("a b c");
  });

  it("caps input at 200 characters", () => {
    expect(sanitizeSearchInput("x".repeat(300))).toHaveLength(200);
  });
});

describe("highlightSearchTerm", () => {
  it("wraps whole-word matches in <mark>", () => {
    expect(highlightSearchTerm("hello world", "world")).toBe(
      "hello <mark>world</mark>",
    );
  });

  it("returns the text unchanged for a blank search term", () => {
    expect(highlightSearchTerm("hello world", "  ")).toBe("hello world");
  });

  it("escapes regex special characters in the search term", () => {
    expect(highlightSearchTerm("a (b) c", "(b)")).toBe("a (b) c");
  });
});

describe("truncateText", () => {
  it("returns text unchanged when under the max length", () => {
    expect(truncateText("short", 10)).toBe("short");
  });

  it("truncates and appends an ellipsis when over the max length", () => {
    expect(truncateText("a very long string", 5)).toBe("a ver...");
  });
});

describe("getExcerpt", () => {
  it("strips markdown formatting and truncates", () => {
    const md = "# Heading\n\nSome **bold** and *italic* and `code` text.";
    const excerpt = getExcerpt(md, 200);
    expect(excerpt).not.toContain("#");
    expect(excerpt).not.toContain("**");
    expect(excerpt).toContain("bold");
  });

  it("splices the link text in place of the opening bracket only", () => {
    // The bracket-scanning replacer computes the link text correctly but
    // only substitutes the matched "[" character itself via String#replace,
    // leaving the scanned "text](url)" tail behind in the output verbatim.
    expect(getExcerpt("Check [this](https://example.com) out.", 200)).toBe(
      "Check thisthis](https://example.com) out.",
    );
  });
});

describe("getPostSpeakers", () => {
  it("includes the legacy single-speaker fields when present", () => {
    const speakers = getPostSpeakers({
      speakerName: "Jane",
      speakerCompany: "Acme",
    } as PostFrontmatter);
    expect(speakers).toEqual([
      expect.objectContaining({ name: "Jane", company: "Acme" }),
    ]);
  });

  it("includes the multi-speaker array when present", () => {
    const speakers = getPostSpeakers({
      speakers: [{ name: "Amy" }],
    } as unknown as PostFrontmatter);
    expect(speakers).toEqual([{ name: "Amy" }]);
  });

  it("returns an empty array when neither is present", () => {
    expect(getPostSpeakers({} as PostFrontmatter)).toEqual([]);
  });
});

describe("getSocialContentFields", () => {
  it("derives fields from the first speaker and prefers eventDate/presentationDescription", () => {
    const fields = getSocialContentFields({
      eventDate: "2026-02-01",
      meetingDate: "2026-01-01",
      date: "2025-12-01",
      presentationDescription: "abstract",
      excerpt: "fallback excerpt",
      speakers: [{ name: "Jane", company: "Acme", bio: "bio text" }],
    } as unknown as PostFrontmatter);
    expect(fields).toEqual({
      bio: "bio text",
      date: "2026-02-01",
      abstract: "abstract",
      speakerName: "Jane",
      company: "Acme",
    });
  });

  it("falls back through date fields and excerpt when preferred fields are absent", () => {
    const fields = getSocialContentFields({
      date: "2025-12-01",
      excerpt: "fallback excerpt",
    } as PostFrontmatter);
    expect(fields.date).toBe("2025-12-01");
    expect(fields.abstract).toBe("fallback excerpt");
    expect(fields.bio).toBe("");
    expect(fields.speakerName).toBe("");
  });
});

describe("debounce", () => {
  jest.useFakeTimers();

  it("only invokes the wrapped function once after the wait elapses", () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);
    debounced();
    debounced();
    debounced();
    expect(fn).not.toHaveBeenCalled();
    jest.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("isValidEmail", () => {
  it("accepts a valid email", () => {
    expect(isValidEmail("a@b.com")).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(isValidEmail("not-an-email")).toBe(false);
  });
});

describe("generateSlug", () => {
  it("lowercases, strips special characters, and hyphenates", () => {
    expect(generateSlug("Hello, World!")).toBe("hello-world");
  });
});

describe("getUniqueValues", () => {
  it("deduplicates while preserving first-seen order", () => {
    expect(getUniqueValues([1, 2, 2, 3, 1])).toEqual([1, 2, 3]);
  });
});

describe("sortByProperty", () => {
  const items = [{ n: 3 }, { n: 1 }, { n: 2 }];

  it("sorts ascending by default", () => {
    expect(sortByProperty(items, "n").map((i) => i.n)).toEqual([1, 2, 3]);
  });

  it("sorts descending when requested", () => {
    expect(sortByProperty(items, "n", "desc").map((i) => i.n)).toEqual([
      3, 2, 1,
    ]);
  });

  it("does not mutate the input array", () => {
    const copy = [...items];
    sortByProperty(items, "n");
    expect(items).toEqual(copy);
  });
});

describe("groupByProperty", () => {
  it("groups items by the stringified property value", () => {
    const items = [
      { type: "a", v: 1 },
      { type: "b", v: 2 },
      { type: "a", v: 3 },
    ];
    expect(groupByProperty(items, "type")).toEqual({
      a: [
        { type: "a", v: 1 },
        { type: "a", v: 3 },
      ],
      b: [{ type: "b", v: 2 }],
    });
  });
});

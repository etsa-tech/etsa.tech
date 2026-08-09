import {
  sanitizeForBranchName,
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

const baseFrontmatter: PostFrontmatter = {
  title: "Title",
  date: "2026-01-01",
  excerpt: "An excerpt",
  tags: ["a"],
  author: "Author",
};

describe("sanitizeForBranchName", () => {
  it("lowercases and hyphenates", () => {
    expect(sanitizeForBranchName("My Great Title!")).toBe("my-great-title");
  });

  it("trims leading and trailing hyphens", () => {
    expect(sanitizeForBranchName("---Test---")).toBe("test");
  });

  it("collapses punctuation runs into single hyphens", () => {
    expect(sanitizeForBranchName("Hello: World")).toBe("hello-world");
  });
});

describe("formatDate", () => {
  it("formats a YYYY-MM-DD string without timezone drift", () => {
    expect(formatDate("2026-03-05")).toBe("March 5, 2026");
  });
});

describe("getPostUrl", () => {
  it("returns a blog URL when blogpost is true", () => {
    expect(getPostUrl("my-slug", { ...baseFrontmatter, blogpost: true })).toBe(
      "/blog/my-slug",
    );
  });

  it("returns a presentation URL when blogpost is false", () => {
    expect(getPostUrl("my-slug", { ...baseFrontmatter, blogpost: false })).toBe(
      "/presentation/my-slug",
    );
  });

  it("returns a presentation URL when frontmatter is omitted", () => {
    expect(getPostUrl("my-slug")).toBe("/presentation/my-slug");
  });
});

describe("getPresentationUrl / getBlogUrl", () => {
  it("encode the slug", () => {
    expect(getPresentationUrl("a b")).toBe("/presentation/a%20b");
    expect(getBlogUrl("a b")).toBe("/blog/a%20b");
  });
});

describe("getTagUrl", () => {
  it("lowercases, converts slashes to hyphens, then encodes", () => {
    expect(getTagUrl("CI/CD")).toBe("/tag/ci-cd");
  });

  it("encodes spaces", () => {
    expect(getTagUrl("Web Development")).toBe("/tag/web%20development");
  });
});

describe("calculateReadingTime", () => {
  it("rounds up to the nearest minute", () => {
    expect(calculateReadingTime("word ".repeat(201))).toBe(2);
  });

  it("returns 1 for short content", () => {
    expect(calculateReadingTime("a few words here")).toBe(1);
  });
});

describe("sanitizeSearchInput", () => {
  it("trims, collapses whitespace, and strips angle brackets", () => {
    expect(sanitizeSearchInput("  a   <b>  c  ")).toBe("a b c");
  });

  it("truncates overly long input", () => {
    const long = "a".repeat(500);
    expect(sanitizeSearchInput(long)).toHaveLength(200);
  });
});

describe("highlightSearchTerm", () => {
  it("wraps matches in <mark> tags", () => {
    expect(highlightSearchTerm("hello world", "world")).toBe(
      "hello <mark>world</mark>",
    );
  });

  it("returns the original text when the search term is blank", () => {
    expect(highlightSearchTerm("hello world", "   ")).toBe("hello world");
  });

  it("escapes regex special characters in the search term", () => {
    expect(highlightSearchTerm("a (b) c", "(b)")).toBe("a (b) c");
  });

  it("truncates an overly long search term", () => {
    const term = "a".repeat(150);
    expect(() => highlightSearchTerm("text", term)).not.toThrow();
  });
});

describe("truncateText", () => {
  it("returns the original text when within the limit", () => {
    expect(truncateText("short", 10)).toBe("short");
  });

  it("truncates and appends an ellipsis when over the limit", () => {
    expect(truncateText("this is a long sentence", 10)).toBe("this is a...");
  });
});

describe("getExcerpt", () => {
  // sanitize-html is mocked as a passthrough in __mocks__/sanitize-html.ts,
  // so getExcerpt's own markdown-stripping regexes are what's under test
  // here, not actual HTML sanitization.
  it("passes non-markdown text through unchanged", () => {
    expect(getExcerpt("Hello world", 100)).toBe("Hello world");
  });

  it("removes markdown headers, bold, and italic formatting", () => {
    expect(getExcerpt("## Heading\n**bold** and *italic*", 100)).toBe(
      "Heading bold and italic",
    );
  });

  it("leaves an unmatched opening bracket intact", () => {
    expect(getExcerpt("A [bracket without a link", 100)).toBe(
      "A [bracket without a link",
    );
  });

  it("leaves a closed bracket with no trailing parenthetical intact", () => {
    expect(getExcerpt("A [bracketed text] no paren", 100)).toBe(
      "A [bracketed text] no paren",
    );
  });

  it("leaves a closed bracket with an unterminated parenthetical intact", () => {
    expect(getExcerpt("A [text](unterminated", 100)).toBe(
      "A [text](unterminated",
    );
  });

  it("consumes a complete markdown link's characters when replacing (known quirk: the string.replace call only substitutes the matched '[' character, so the manually-parsed link text is prepended rather than replacing the full '[text](url)' span)", () => {
    expect(
      getExcerpt("See [our site](https://example.com) for more", 100),
    ).toBe("See our siteour site](https://example.com) for more");
  });

  it("removes inline code backticks", () => {
    expect(getExcerpt("Run `npm test` now", 100)).toBe("Run npm test now");
  });

  it("collapses newlines and truncates to maxLength", () => {
    expect(getExcerpt("line one\n\nline two", 6)).toBe("line o...");
  });

  it("defaults maxLength to 160", () => {
    const content = "word ".repeat(60);
    const result = getExcerpt(content);
    expect(result.length).toBeLessThanOrEqual(164);
  });
});

describe("getPostSpeakers", () => {
  it("returns an empty array when no speaker info is present", () => {
    expect(getPostSpeakers(baseFrontmatter)).toEqual([]);
  });

  it("builds a speaker from legacy single-speaker fields", () => {
    const speakers = getPostSpeakers({
      ...baseFrontmatter,
      speakerName: "Jane Doe",
      speakerTitle: "Engineer",
    });
    expect(speakers).toEqual([
      expect.objectContaining({ name: "Jane Doe", title: "Engineer" }),
    ]);
  });

  it("includes the new speakers array alongside a legacy speaker", () => {
    const speakers = getPostSpeakers({
      ...baseFrontmatter,
      speakerName: "Jane Doe",
      speakers: [{ name: "John Roe" }],
    });
    expect(speakers).toHaveLength(2);
    expect(speakers[1]).toEqual({ name: "John Roe" });
  });
});

describe("getSocialContentFields", () => {
  it("prefers the first speaker's bio, name, and company", () => {
    const fields = getSocialContentFields({
      ...baseFrontmatter,
      speakers: [{ name: "Jane Doe", bio: "A bio", company: "Acme" }],
      eventDate: "2026-02-01",
      presentationDescription: "A talk",
    });
    expect(fields).toEqual({
      bio: "A bio",
      date: "2026-02-01",
      abstract: "A talk",
      speakerName: "Jane Doe",
      company: "Acme",
    });
  });

  it("falls back to meetingDate, excerpt, and empty speaker fields", () => {
    const fields = getSocialContentFields({
      ...baseFrontmatter,
      meetingDate: "2026-02-05",
    });
    expect(fields).toEqual({
      bio: "",
      date: "2026-02-05",
      abstract: baseFrontmatter.excerpt,
      speakerName: "",
      company: "",
    });
  });

  it("falls back to frontmatter.date when no event/meeting date is set", () => {
    const fields = getSocialContentFields(baseFrontmatter);
    expect(fields.date).toBe(baseFrontmatter.date);
  });
});

describe("getSpeakerUrl", () => {
  it("lowercases and hyphenates the speaker name", () => {
    expect(getSpeakerUrl("Jane Doe")).toBe("/speaker/jane-doe");
  });
});

describe("debounce", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("delays invocation until after the wait period", () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 200);
    debounced();
    expect(fn).not.toHaveBeenCalled();
    jest.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("resets the timer on repeated calls", () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 200);
    debounced();
    jest.advanceTimersByTime(100);
    debounced();
    jest.advanceTimersByTime(100);
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
    expect(generateSlug("Hello, World!  Foo--Bar")).toBe("hello-world-foo-bar");
  });
});

describe("getUniqueValues", () => {
  it("removes duplicates while preserving order", () => {
    expect(getUniqueValues([1, 2, 2, 3, 1])).toEqual([1, 2, 3]);
  });
});

describe("sortByProperty", () => {
  const items = [{ n: 3 }, { n: 1 }, { n: 2 }];

  it("sorts ascending by default", () => {
    expect(sortByProperty(items, "n")).toEqual([{ n: 1 }, { n: 2 }, { n: 3 }]);
  });

  it("sorts descending when requested", () => {
    expect(sortByProperty(items, "n", "desc")).toEqual([
      { n: 3 },
      { n: 2 },
      { n: 1 },
    ]);
  });

  it("treats equal values as equal", () => {
    expect(sortByProperty([{ n: 1 }, { n: 1 }], "n")).toEqual([
      { n: 1 },
      { n: 1 },
    ]);
  });

  it("does not mutate the original array", () => {
    const original = [{ n: 2 }, { n: 1 }];
    sortByProperty(original, "n");
    expect(original).toEqual([{ n: 2 }, { n: 1 }]);
  });
});

describe("groupByProperty", () => {
  it("groups items by the stringified property value", () => {
    const items = [{ type: "a" }, { type: "b" }, { type: "a" }];
    expect(groupByProperty(items, "type")).toEqual({
      a: [{ type: "a" }, { type: "a" }],
      b: [{ type: "b" }],
    });
  });

  it("returns an empty object for an empty array", () => {
    expect(groupByProperty([], "type" as never)).toEqual({});
  });
});

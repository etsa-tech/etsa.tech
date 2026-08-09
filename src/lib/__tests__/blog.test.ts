import fs from "fs";
import path from "path";
import {
  getPostSlugs,
  getBlogPostSlugs,
  getPresentationPostSlugs,
  getPostBySlug,
  getAllPosts,
  getPostsByTag,
  getAllTags,
  getTagsWithCount,
  getPopularTags,
  getBlogPosts,
  getPresentationPosts,
  getRecentBlogPosts,
  getRecentPresentationPosts,
  getRecentPosts,
  getLatestPost,
  searchPosts,
  formatDate,
  getPostUrl,
  getTagUrl,
  getSpeakerUrl,
  getAllSpeakers,
  getPostsBySpeaker,
  getPostSpeakers,
} from "@/lib/blog";

jest.mock("fs");
const mockedFs = jest.mocked(fs);

// remark/remark-html are ESM-only and not transformed by next/jest's default
// transformIgnorePatterns - stub them with a minimal markdown->HTML stand-in
// rather than fighting the transform config for a dependency this suite
// doesn't need real fidelity from.
jest.mock("remark", () => ({
  remark: () => ({
    use: () => ({
      process: async (input: string) => ({
        toString: () => `<p>${input}</p>`,
      }),
    }),
  }),
}));
jest.mock("remark-html", () => ({ __esModule: true, default: {} }));

function postFile(
  overrides: Record<string, unknown> = {},
  body = "Body text.",
) {
  const fm: Record<string, unknown> = {
    title: "A Post",
    date: "2026-01-01",
    excerpt: "An excerpt",
    tags: ["react"],
    ...overrides,
  };
  const yamlLines = Object.entries(fm).map(([k, v]) => {
    if (Array.isArray(v)) return `${k}: [${v.map((x) => `"${x}"`).join(", ")}]`;
    if (typeof v === "boolean" || typeof v === "number") return `${k}: ${v}`;
    return `${k}: "${v}"`;
  });
  return `---\n${yamlLines.join("\n")}\n---\n${body}\n`;
}

// Presentation posts live under posts/<slug>.md; blog posts under
// posts_blog/<slug>.md. Route each mocked fs call by exact path (built the
// same way blog.ts itself builds them) rather than string suffix matching -
// endsWith(`${slug}.md`) would false-positive on e.g. slug "talk" matching
// path ".../unpublished-talk.md".
function mockDirectories(opts: {
  presentation?: Record<string, string>; // slug -> file content
  blog?: Record<string, string>;
}) {
  const presentation = opts.presentation ?? {};
  const blog = opts.blog ?? {};
  const postsDir = path.join(process.cwd(), "posts");
  const blogDir = path.join(process.cwd(), "posts_blog");

  const files = new Map<string, string>();
  for (const [slug, content] of Object.entries(presentation)) {
    files.set(path.join(postsDir, `${slug}.md`), content);
  }
  for (const [slug, content] of Object.entries(blog)) {
    files.set(path.join(blogDir, `${slug}.md`), content);
  }

  mockedFs.existsSync.mockImplementation((p: fs.PathLike) => {
    const s = String(p);
    if (s === blogDir) return Object.keys(blog).length > 0;
    if (s === postsDir) return Object.keys(presentation).length > 0;
    return files.has(s);
  });

  mockedFs.readdirSync.mockImplementation((p: fs.PathLike) => {
    const s = String(p);
    if (s === blogDir) {
      return Object.keys(blog).map((slug) => `${slug}.md`) as never;
    }
    if (s === postsDir) {
      return Object.keys(presentation).map((slug) => `${slug}.md`) as never;
    }
    return [] as never;
  });

  mockedFs.readFileSync.mockImplementation((p: fs.PathOrFileDescriptor) => {
    const s = String(p);
    const content = files.get(s);
    if (content === undefined) throw new Error(`ENOENT: ${s}`);
    return content;
  });
}

afterEach(() => jest.resetAllMocks());

describe("slug listing", () => {
  it("getPostSlugs combines presentation and blog slugs", () => {
    mockDirectories({
      presentation: { "pres-1": postFile() },
      blog: { "blog-1": postFile() },
    });
    expect(getPostSlugs().sort()).toEqual(["blog-1", "pres-1"]);
  });

  it("getPostSlugs returns an empty array when neither directory exists", () => {
    mockDirectories({});
    expect(getPostSlugs()).toEqual([]);
  });

  it("getBlogPostSlugs / getPresentationPostSlugs return only their own slugs", () => {
    mockDirectories({
      presentation: { "pres-1": postFile() },
      blog: { "blog-1": postFile() },
    });
    expect(getBlogPostSlugs()).toEqual(["blog-1"]);
    expect(getPresentationPostSlugs()).toEqual(["pres-1"]);
  });
});

describe("readPostsFromDirectory error handling", () => {
  // Directory listing (readdirSync) reports the file, but reading it
  // (readFileSync) throws - exercises the per-slug catch in
  // readPostsFromDirectory, which labels the error "blog" or
  // "presentation" depending on which directory it was reading.
  it("logs a blog-labeled error and excludes the post when reading a blog file throws", () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const blogDir = path.join(process.cwd(), "posts_blog");
    mockedFs.existsSync.mockImplementation((p) => String(p) === blogDir);
    mockedFs.readdirSync.mockImplementation((p) =>
      String(p) === blogDir ? (["broken.md"] as never) : ([] as never),
    );
    mockedFs.readFileSync.mockImplementation(() => {
      throw new Error("boom");
    });

    expect(getBlogPosts()).toEqual([]);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Error reading blog post broken:"),
      expect.any(Error),
    );
  });

  it("logs a presentation-labeled error and excludes the post when reading a presentation file throws", () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const postsDir = path.join(process.cwd(), "posts");
    mockedFs.existsSync.mockImplementation((p) => String(p) === postsDir);
    mockedFs.readdirSync.mockImplementation((p) =>
      String(p) === postsDir ? (["broken.md"] as never) : ([] as never),
    );
    mockedFs.readFileSync.mockImplementation(() => {
      throw new Error("boom");
    });

    expect(getPresentationPosts()).toEqual([]);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Error reading presentation post broken:"),
      expect.any(Error),
    );
  });
});

describe("getPostBySlug", () => {
  it("returns the rendered post from the blog directory when present there", async () => {
    mockDirectories({ blog: { "my-post": postFile({ title: "Blog Post" }) } });
    const post = await getPostBySlug("my-post");
    expect(post?.frontmatter.title).toBe("Blog Post");
    expect(post?.content).toContain("<p>Body text.</p>");
    expect(post?.readingTime).toBe(1);
  });

  it("falls back to the presentation directory when not a blog post", async () => {
    mockDirectories({
      presentation: { "my-talk": postFile({ title: "Talk" }) },
    });
    const post = await getPostBySlug("my-talk");
    expect(post?.frontmatter.title).toBe("Talk");
  });

  it("returns null when the slug exists in neither directory", async () => {
    mockDirectories({});
    expect(await getPostBySlug("missing")).toBeNull();
  });

  it("strips zero-width characters and normalizes line endings", async () => {
    mockDirectories({
      blog: {
        "weird-post": postFile({}, "Line one​\r\nLine two\r"),
      },
    });
    const post = await getPostBySlug("weird-post");
    expect(post?.content).not.toContain("​");
  });

  it("returns null when reading the file throws", async () => {
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockImplementation(() => {
      throw new Error("boom");
    });
    expect(await getPostBySlug("any")).toBeNull();
  });
});

describe("getAllPosts and derived listings", () => {
  beforeEach(() => {
    mockDirectories({
      presentation: {
        talk: postFile({
          title: "Talk",
          date: "2026-01-01",
          tags: ["react", "testing"],
        }),
        "unpublished-talk": postFile({
          title: "Hidden",
          date: "2026-01-05",
          published: false,
        }),
      },
      blog: {
        "blog-post": postFile({
          title: "Blog",
          date: "2026-02-01",
          tags: ["node"],
        }),
      },
    });
  });

  it("returns published posts sorted newest first", () => {
    const posts = getAllPosts();
    expect(posts.map((p) => p.slug)).toEqual(["blog-post", "talk"]);
  });

  it("getPostsByTag matches case-insensitively", () => {
    expect(getPostsByTag("REACT").map((p) => p.slug)).toEqual(["talk"]);
  });

  it("getAllTags returns unique, sorted tags", () => {
    expect(getAllTags()).toEqual(["node", "react", "testing"]);
  });

  it("getTagsWithCount sorts by descending usage", () => {
    expect(getTagsWithCount()[0].count).toBeGreaterThanOrEqual(1);
  });

  it("getPopularTags caps at the given limit", () => {
    expect(getPopularTags(1)).toHaveLength(1);
  });

  it("getBlogPosts / getPresentationPosts split by source", () => {
    expect(getBlogPosts().map((p) => p.slug)).toEqual(["blog-post"]);
    expect(getPresentationPosts().map((p) => p.slug)).toEqual(["talk"]);
  });

  it("getRecentBlogPosts / getRecentPresentationPosts / getRecentPosts respect the limit", () => {
    expect(getRecentBlogPosts(1)).toHaveLength(1);
    expect(getRecentPresentationPosts(1)).toHaveLength(1);
    expect(getRecentPosts(1)).toHaveLength(1);
  });

  it("getLatestPost returns the newest post", () => {
    expect(getLatestPost()?.slug).toBe("blog-post");
  });

  it("searchPosts matches on title, excerpt, or tags", () => {
    expect(searchPosts("blog").map((p) => p.slug)).toEqual(["blog-post"]);
    expect(searchPosts("testing").map((p) => p.slug)).toEqual(["talk"]);
  });
});

describe("getLatestPost with no posts", () => {
  it("returns null", () => {
    mockDirectories({});
    expect(getLatestPost()).toBeNull();
  });
});

describe("URL / formatting helpers", () => {
  it("formatDate formats without timezone drift", () => {
    expect(formatDate("2026-03-04")).toBe("March 4, 2026");
  });

  it("getPostUrl / getTagUrl / getSpeakerUrl encode their inputs", () => {
    expect(getPostUrl("a b")).toBe("/presentation/a%20b");
    expect(getTagUrl("CI/CD")).toBe("/tag/ci%2Fcd");
    expect(getSpeakerUrl("Jane Doe")).toBe("/speaker/jane-doe");
  });
});

describe("speaker helpers", () => {
  beforeEach(() => {
    mockDirectories({
      presentation: {
        "legacy-talk": postFile({ speakerName: "Jane Doe" }),
        "multi-talk": `---\ntitle: "Multi"\ndate: "2026-01-02"\nexcerpt: "e"\ntags: ["x"]\nspeakers:\n  - name: "Amy Zhou"\n---\nBody.\n`,
      },
    });
  });

  it("getAllSpeakers collects legacy and multi-speaker names, sorted", () => {
    expect(getAllSpeakers()).toEqual(["Amy Zhou", "Jane Doe"]);
  });

  it("getPostsBySpeaker matches the legacy speakerName field case-insensitively", () => {
    expect(getPostsBySpeaker("jane doe").map((p) => p.slug)).toEqual([
      "legacy-talk",
    ]);
  });

  it("getPostsBySpeaker matches the multi-speaker array", () => {
    expect(getPostsBySpeaker("Amy Zhou").map((p) => p.slug)).toEqual([
      "multi-talk",
    ]);
  });

  it("getPostsBySpeaker returns nothing for an unknown speaker", () => {
    expect(getPostsBySpeaker("Nobody")).toEqual([]);
  });
});

describe("getPostSpeakers", () => {
  it("builds a speaker from legacy fields", () => {
    const speakers = getPostSpeakers({
      speakerName: "Jane",
      speakerCompany: "Acme",
    } as never);
    expect(speakers).toEqual([expect.objectContaining({ name: "Jane" })]);
  });

  it("includes the multi-speaker array", () => {
    const speakers = getPostSpeakers({ speakers: [{ name: "Amy" }] } as never);
    expect(speakers).toEqual([{ name: "Amy" }]);
  });

  it("returns an empty array with no speaker data", () => {
    expect(getPostSpeakers({} as never)).toEqual([]);
  });
});

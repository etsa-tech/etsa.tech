import prettier from "prettier";
import {
  formatMarkdownContent,
  formatYamlContent,
  formatBlogPostContent,
  formatJsonContent,
  isPrettierAvailable,
} from "@/lib/server-only-formatter";

jest.mock("prettier", () => ({ format: jest.fn() }));

const mockedFormat = jest.mocked(prettier.format);

afterEach(() => jest.resetAllMocks());

describe("formatMarkdownContent", () => {
  it("returns the formatted content on success", async () => {
    mockedFormat.mockResolvedValue("# formatted\n");
    expect(await formatMarkdownContent("# raw")).toBe("# formatted\n");
  });

  it("falls back to the original content on failure", async () => {
    mockedFormat.mockRejectedValue(new Error("parse error"));
    expect(await formatMarkdownContent("# raw")).toBe("# raw");
  });
});

describe("formatYamlContent", () => {
  it("returns the formatted content on success", async () => {
    mockedFormat.mockResolvedValue("title: x\n");
    expect(await formatYamlContent("title:  x")).toBe("title: x\n");
  });

  it("falls back to the original content on failure", async () => {
    mockedFormat.mockRejectedValue(new Error("bad yaml"));
    expect(await formatYamlContent("title:  x")).toBe("title:  x");
  });
});

describe("formatJsonContent", () => {
  it("returns the formatted content on success", async () => {
    mockedFormat.mockResolvedValue('{ "a": 1 }\n');
    expect(await formatJsonContent('{"a":1}')).toBe('{ "a": 1 }\n');
  });

  it("falls back to the original content on failure", async () => {
    mockedFormat.mockRejectedValue(new Error("bad json"));
    expect(await formatJsonContent("{bad")).toBe("{bad");
  });
});

describe("formatBlogPostContent", () => {
  it("formats frontmatter and markdown separately when frontmatter is present", async () => {
    mockedFormat.mockImplementation(async (content, opts) => {
      if ((opts as { parser?: string })?.parser === "yaml") return "title: x";
      return "# body";
    });
    const result = await formatBlogPostContent("---\ntitle:  x\n---\n# body\n");
    expect(result).toBe("---\ntitle: x\n---\n\n# body\n");
  });

  it("formats as plain markdown when there's no frontmatter", async () => {
    mockedFormat.mockResolvedValue("# body\n");
    const result = await formatBlogPostContent("# body");
    expect(result).toBe("# body\n");
  });

  it("reconstructs from the original sections when their formatters throw", async () => {
    mockedFormat.mockRejectedValue(new Error("boom"));
    const original = "---\ntitle:  x\n---\n# body\n";
    // formatYamlContent/formatMarkdownContent each swallow their own
    // errors and return the input unchanged, so the outer catch here is
    // never reached - reconstruction just re-inserts the blank line
    // formatBlogPostContent always places between frontmatter and body.
    expect(await formatBlogPostContent(original)).toBe(
      "---\ntitle:  x\n---\n\n# body\n",
    );
  });
});

describe("isPrettierAvailable", () => {
  it("returns true when prettier.format succeeds", async () => {
    mockedFormat.mockResolvedValue("# Test\n");
    expect(await isPrettierAvailable()).toBe(true);
  });

  it("returns false when prettier.format throws", async () => {
    mockedFormat.mockRejectedValue(new Error("unavailable"));
    expect(await isPrettierAvailable()).toBe(false);
  });
});

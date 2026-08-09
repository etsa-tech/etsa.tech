/**
 * @jest-environment jsdom
 */
import {
  render,
  screen,
  waitFor,
  within,
  fireEvent,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BlogPostEditor from "@/components/admin/BlogPostEditor";

// Monaco is dynamically imported via next/dynamic(ssr:false); stub it with a
// plain textarea keyed by language so tests can read/drive its value without
// pulling in the real editor or fighting the dynamic-import loading state.
jest.mock("@monaco-editor/react", () => ({
  __esModule: true,
  default: ({
    value,
    onChange,
    defaultLanguage,
  }: {
    value: string;
    onChange: (v: string | undefined) => void;
    defaultLanguage: string;
  }) => (
    <textarea
      data-testid={`monaco-${defaultLanguage}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

// remark/remark-html are ESM-only and not transformed by next/jest's default
// transformIgnorePatterns - stub with a minimal stand-in, matching the
// approach used for src/lib/__tests__/blog.test.ts. Routed through a
// jest.fn() (rather than spying on the "remark" module's ESM namespace,
// which doesn't reliably alias the SUT's own import binding) so a single
// test can override it to reject and exercise the error-handling path.
const mockRemarkProcess = jest.fn(async (input: string) => ({
  toString: () => `<p>${input}</p>`,
}));
jest.mock("remark", () => ({
  remark: () => ({
    use: () => ({
      process: (input: string) => mockRemarkProcess(input),
    }),
  }),
}));
jest.mock("remark-html", () => ({ __esModule: true, default: {} }));

const originalFetch = global.fetch;
const originalConfirm = window.confirm;
const originalAlert = window.alert;

beforeEach(() => {
  window.confirm = jest.fn(() => true);
  window.alert = jest.fn();
});

afterEach(() => {
  global.fetch = originalFetch;
  window.confirm = originalConfirm;
  window.alert = originalAlert;
  jest.restoreAllMocks();
});

function onSaveMock() {
  return jest.fn().mockResolvedValue(undefined);
}

async function yamlTextarea() {
  return (await screen.findByTestId("monaco-yaml")) as HTMLTextAreaElement;
}

async function contentTextarea() {
  return (await screen.findByTestId("monaco-markdown")) as HTMLTextAreaElement;
}

const editFrontmatter = {
  title: "Existing Post",
  date: "2026-01-01",
  excerpt: "An excerpt",
  tags: ["react", "testing"],
  speakerName: "Jane Doe",
  speakerTitle: "Engineer",
  speakerCompany: "Acme",
  published: true,
};

const editInitialData = {
  slug: "2026-01-01-existing-post",
  frontmatter: editFrontmatter,
  content: "Existing body",
  rawContent: `---\ntitle: "Existing Post"\ndate: "2026-01-01"\n---\nExisting body`,
};

describe("BlogPostEditor - live YAML template fallback placeholders", () => {
  it("falls back to placeholder values in the live YAML template when optional fields are cleared", async () => {
    render(
      <BlogPostEditor onSave={onSaveMock()} initialData={editInitialData} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Show YAML" }));
    const yaml = await yamlTextarea();

    fireEvent.change(screen.getByLabelText(/^Author/), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText(/^Event Date/), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText("Venue Name"), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText("Address"), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText("Latitude"), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText("Longitude"), {
      target: { value: "" },
    });
    // Also clear speakerName to confirm the placeholder image path branch.
    fireEvent.change(screen.getByLabelText("Speaker Name"), {
      target: { value: "" },
    });

    await waitFor(() => {
      expect(yaml.value).toContain("author: ETSA");
      expect(yaml.value).toContain("name: Knoxville Entrepreneur Center");
      expect(yaml.value).toContain(
        "address: 17 Market Square SUITE 101, Knoxville, TN 37902",
      );
      expect(yaml.value).toContain('lat: "35.965179"');
      expect(yaml.value).toContain('lng: "-83.919846"');
      expect(yaml.value).toContain("image: /images/speakers/speaker_name.jpeg");
    });
    // eventDate falls back to a computed default rather than staying blank.
    expect(yaml.value).not.toContain("eventDate: \n");
  });

  it("uses the entered speaker name to derive the placeholder image filename in the live YAML template", async () => {
    render(<BlogPostEditor onSave={onSaveMock()} />);
    await yamlTextarea();
    await userEvent.type(screen.getByLabelText(/^Title/), "T");
    await userEvent.type(screen.getByLabelText("Speaker Name"), "Jane Q. Doe");
    const yaml = await yamlTextarea();
    await waitFor(() =>
      expect(yaml.value).toContain("image: /images/speakers/jane_q._doe.jpeg"),
    );
  });
});

describe("BlogPostEditor - default event date (first Tuesday of next month)", () => {
  afterEach(() => jest.useRealTimers());

  it.each([
    ["next month's 1st is a Sunday", "2026-01-15T12:00:00.000Z", "2026-02-03"],
    [
      "next month's 1st is on/before Tuesday",
      "2026-05-15T12:00:00.000Z",
      "2026-06-02",
    ],
    [
      "next month's 1st is after Tuesday",
      "2026-03-15T12:00:00.000Z",
      "2026-04-07",
    ],
  ])("computes the right default when %s", async (_label, now, expected) => {
    jest.useFakeTimers().setSystemTime(new Date(now));
    render(<BlogPostEditor onSave={onSaveMock()} />);
    expect(screen.getByLabelText("Event Date")).toHaveValue(expected);
  });
});

describe("BlogPostEditor - new post mode", () => {
  it("auto-expands the YAML editor and generates a slug from title + date", async () => {
    render(<BlogPostEditor onSave={onSaveMock()} />);
    await yamlTextarea(); // auto-expanded for new posts

    // Date defaults to today, so pin it to a known value for a deterministic
    // slug assertion instead of computing "today" here too.
    fireEvent.change(screen.getByLabelText(/^Date/), {
      target: { value: "2026-01-01" },
    });
    await userEvent.type(screen.getByLabelText(/^Title/), "My Great Talk");
    await waitFor(() =>
      expect(screen.getByLabelText(/Slug/)).toHaveValue(
        "2026-01-01-my-great-talk",
      ),
    );
  });

  it("shows the live-template blue notice and the required-for-new-posts badge", async () => {
    render(<BlogPostEditor onSave={onSaveMock()} />);
    expect(screen.getByText("Live Template")).toBeInTheDocument();
    expect(screen.getByText("Required for new posts")).toBeInTheDocument();
  });

  it("blocks submission and shows validation errors when required fields are empty", async () => {
    const onSave = onSaveMock();
    render(<BlogPostEditor onSave={onSave} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Create Pull Request" }),
    );
    expect(await screen.findByText("Title is required")).toBeInTheDocument();
    expect(screen.getByText("Excerpt is required")).toBeInTheDocument();
    expect(
      screen.getByText("At least one tag is required"),
    ).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("submits successfully once required fields are filled", async () => {
    const onSave = onSaveMock();
    render(<BlogPostEditor onSave={onSave} />);
    await userEvent.type(screen.getByLabelText(/^Title/), "My Post Title");
    await userEvent.type(screen.getByLabelText(/Excerpt/), "Some excerpt text");
    await userEvent.type(screen.getByLabelText(/Tags/), "react, testing");

    await userEvent.click(
      screen.getByRole("button", { name: "Create Pull Request" }),
    );

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const call = onSave.mock.calls[0][0];
    expect(call.createPR).toBe(true);
    expect(call.frontmatter.title).toBe("My Post Title");
  });

  it("live-updates the YAML template as form fields change", async () => {
    render(<BlogPostEditor onSave={onSaveMock()} />);
    // escapeYamlString only quotes values with special characters, so a
    // plain title stays unquoted in the generated template.
    await userEvent.type(screen.getByLabelText(/^Title/), "Live Title");
    await waitFor(async () =>
      expect((await yamlTextarea()).value).toContain("title: Live Title"),
    );
  });

  it("shows an 'enter title and date' empty state for assets before a slug exists", async () => {
    render(<BlogPostEditor onSave={onSaveMock()} />);
    await userEvent.click(screen.getByRole("button", { name: "Show Assets" }));
    expect(
      screen.getByText("Enter title and date to browse assets"),
    ).toBeInTheDocument();
  });
});

describe("BlogPostEditor - edit mode", () => {
  it("prefills form fields from frontmatter, including the first legacy speaker", () => {
    render(
      <BlogPostEditor onSave={onSaveMock()} initialData={editInitialData} />,
    );
    expect(screen.getByLabelText(/^Title/)).toHaveValue("Existing Post");
    expect(screen.getByLabelText(/Excerpt/)).toHaveValue("An excerpt");
    expect(screen.getByLabelText(/Tags/)).toHaveValue("react, testing");
    expect(screen.getByLabelText(/Speaker Name/)).toHaveValue("Jane Doe");
    expect(screen.getByLabelText(/Slug/)).toHaveValue(
      "2026-01-01-existing-post",
    );
  });

  it("defaults content and slug to empty strings when initialData omits them", () => {
    // Slug ends up auto-regenerated from title+date by a separate effect
    // (since `!initialData?.slug` is true here too) - what this actually
    // exercises is the `initialData.content || ""` / `initialData.slug ||
    // ""` fallback assignments not throwing on a missing content/slug.
    const data = { frontmatter: editFrontmatter };
    expect(() =>
      render(
        <BlogPostEditor onSave={onSaveMock()} initialData={data as never} />,
      ),
    ).not.toThrow();
    expect(
      (screen.getByTestId("monaco-markdown") as HTMLTextAreaElement).value,
    ).toBe("");
  });

  it("prefills the first speaker from a speakers[] array when legacy fields are absent", () => {
    const data = {
      ...editInitialData,
      frontmatter: {
        ...editFrontmatter,
        speakerName: undefined,
        speakers: [{ name: "Amy Zhou", title: "CTO" }],
      },
    };
    render(
      <BlogPostEditor onSave={onSaveMock()} initialData={data as never} />,
    );
    expect(screen.getByLabelText(/Speaker Name/)).toHaveValue("Amy Zhou");
  });

  it("keeps the YAML editor collapsed by default and shows the amber advanced-editor notice once opened", async () => {
    render(
      <BlogPostEditor onSave={onSaveMock()} initialData={editInitialData} />,
    );
    expect(screen.queryByTestId("monaco-yaml")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Show YAML" }));
    expect(screen.getByText("Advanced Editor")).toBeInTheDocument();
    const yaml = await yamlTextarea();
    expect(yaml.value).toContain("Existing Post");
  });

  it("clears rawYaml when the YAML editor is emptied", async () => {
    render(
      <BlogPostEditor onSave={onSaveMock()} initialData={editInitialData} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Show YAML" }));
    const yaml = await yamlTextarea();
    fireEvent.change(yaml, { target: { value: "" } });
    expect(yaml.value).toBe("");
  });

  it("does not show the slug preview line (only shown for brand-new posts)", () => {
    render(
      <BlogPostEditor onSave={onSaveMock()} initialData={editInitialData} />,
    );
    expect(screen.queryByText(/Preview:/)).not.toBeInTheDocument();
  });
});

describe("BlogPostEditor - branch status indicator", () => {
  it("shows nothing extra on main with no PR and no viewing branch", () => {
    render(
      <BlogPostEditor
        onSave={onSaveMock()}
        initialData={editInitialData}
        currentBranch="main"
      />,
    );
    expect(
      screen.queryByText(/Viewing content from different branch/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Working on update branch/),
    ).not.toBeInTheDocument();
  });

  it("shows the amber 'viewing different branch' banner, resolving the save target to the open PR's branch when viewing main", () => {
    render(
      <BlogPostEditor
        onSave={onSaveMock()}
        initialData={editInitialData}
        currentBranch="fix/some-branch"
        viewingBranch="main"
        openPR={{ branchName: "fix/pr-branch", prNumber: 7 }}
      />,
    );
    expect(
      screen.getByText("Viewing content from different branch"),
    ).toBeInTheDocument();
    expect(screen.getByText("fix/pr-branch")).toBeInTheDocument();
    expect(screen.getByText("(PR #7)")).toBeInTheDocument();
  });

  it("resolves the save target to the viewing branch itself when there's no open PR", () => {
    render(
      <BlogPostEditor
        onSave={onSaveMock()}
        initialData={editInitialData}
        currentBranch="main"
        viewingBranch="fix/existing-post"
      />,
    );
    // "Viewing:" and "Changes will be saved to:" both render this branch
    // name here, since saveToBranch falls back to viewingBranch itself.
    expect(screen.getAllByText("fix/existing-post")).toHaveLength(2);
  });

  it("shows the blue 'working on update branch for this post' banner", () => {
    render(
      <BlogPostEditor
        onSave={onSaveMock()}
        initialData={editInitialData}
        currentBranch="update-post-2026-01-01-existing-post-1700000000000"
      />,
    );
    expect(
      screen.getByText("Working on update branch for this post"),
    ).toBeInTheDocument();
  });

  it("shows the amber 'wrong branch for this post' banner", () => {
    render(
      <BlogPostEditor
        onSave={onSaveMock()}
        initialData={editInitialData}
        currentBranch="fix/some-other-post"
      />,
    );
    expect(screen.getByText("Wrong branch for this post")).toBeInTheDocument();
  });
});

describe("BlogPostEditor - action buttons", () => {
  it("shows only Create Pull Request on main with no open PR", () => {
    render(
      <BlogPostEditor onSave={onSaveMock()} initialData={editInitialData} />,
    );
    expect(
      screen.getByRole("button", { name: "Create Pull Request" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/View PR/)).not.toBeInTheDocument();
  });

  it("shows View PR and Save to PR when on main with an open PR", () => {
    render(
      <BlogPostEditor
        onSave={onSaveMock()}
        initialData={editInitialData}
        currentBranch="main"
        openPR={{ branchName: "fix/x", prNumber: 3 }}
      />,
    );
    expect(screen.getByRole("link", { name: /View PR #3/ })).toHaveAttribute(
      "href",
      "https://github.com/etsa-tech/etsa.tech/pull/3",
    );
    expect(
      screen.getByRole("button", { name: "Save to PR" }),
    ).toBeInTheDocument();
  });

  it("shows Save to branch on a 'feature/' branch matching the sanitized post title", () => {
    render(
      <BlogPostEditor
        onSave={onSaveMock()}
        initialData={editInitialData}
        currentBranch="feature/2026-01-existing-post-update"
      />,
    );
    expect(
      screen.getByRole("button", { name: "Save to branch" }),
    ).toBeInTheDocument();
  });

  it("shows Save to branch when on the update branch for this post", () => {
    render(
      <BlogPostEditor
        onSave={onSaveMock()}
        initialData={editInitialData}
        currentBranch="update-post-2026-01-01-existing-post-123"
      />,
    );
    expect(
      screen.getByRole("button", { name: "Save to branch" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Create Pull Request" }),
    ).not.toBeInTheDocument();
  });

  it("shows the disabled switch-branch state for an update branch on a different post", () => {
    render(
      <BlogPostEditor
        onSave={onSaveMock()}
        initialData={editInitialData}
        currentBranch="fix/some-other-post"
      />,
    );
    expect(
      screen.getByRole("button", { name: "Switch to Main Branch First" }),
    ).toBeDisabled();
  });

  it("calls onSave with createPR:false via Save to branch", async () => {
    const onSave = onSaveMock();
    render(
      <BlogPostEditor
        onSave={onSave}
        initialData={editInitialData}
        currentBranch="update-post-2026-01-01-existing-post-123"
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Save to branch" }),
    );
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0].createPR).toBe(false);
  });

  it("shows in-flight loading labels on Save to branch, Save to PR, and Create Pull Request", () => {
    // isLoading is a prop the parent controls (set while its own onSave
    // handler is in flight), not internal state - so these labels are
    // exercised by passing it directly rather than awaiting a submission.
    const { unmount: unmount1 } = render(
      <BlogPostEditor
        onSave={onSaveMock()}
        initialData={editInitialData}
        currentBranch="update-post-2026-01-01-existing-post-123"
        isLoading
      />,
    );
    expect(
      screen.getByRole("button", { name: "Saving..." }),
    ).toBeInTheDocument();
    unmount1();

    const { unmount: unmount2 } = render(
      <BlogPostEditor
        onSave={onSaveMock()}
        initialData={editInitialData}
        currentBranch="main"
        openPR={{ prNumber: 3, branchName: "fix/x" }}
        isLoading
      />,
    );
    expect(
      screen.getByRole("button", { name: "Saving..." }),
    ).toBeInTheDocument();
    unmount2();

    render(
      <BlogPostEditor
        onSave={onSaveMock()}
        initialData={editInitialData}
        currentBranch="main"
        isLoading
      />,
    );
    expect(
      screen.getByRole("button", { name: "Creating PR..." }),
    ).toBeInTheDocument();
  });
});

describe("BlogPostEditor - assets", () => {
  it("loads and displays existing assets, formatting their size", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        assets: [
          {
            name: "slides.pdf",
            path: "x",
            url: "/x/slides.pdf",
            type: "PDF",
            size: 2048,
          },
        ],
        searchedPath: "public/presentation/2026-01-01-existing-post",
      }),
    }) as unknown as typeof fetch;

    render(
      <BlogPostEditor onSave={onSaveMock()} initialData={editInitialData} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Show Assets" }));
    expect(await screen.findByText("slides.pdf")).toBeInTheDocument();
    expect(screen.getByText("2 KB")).toBeInTheDocument();
  });

  it("renders an asset with no url using its name as the React key", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        assets: [{ name: "no-url.png", path: "x", type: "PNG", size: 1 }],
      }),
    }) as unknown as typeof fetch;
    render(
      <BlogPostEditor onSave={onSaveMock()} initialData={editInitialData} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Show Assets" }));
    expect(await screen.findByText("no-url.png")).toBeInTheDocument();
  });

  it("defaults to an empty asset list and no searched paths when the response omits both fields", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }) as unknown as typeof fetch;

    render(
      <BlogPostEditor onSave={onSaveMock()} initialData={editInitialData} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Show Assets" }));
    expect(await screen.findByText("No assets found")).toBeInTheDocument();
  });

  it("shows a 'no assets found' state with searched locations when the list is empty", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        assets: [],
        searchedPath: "public/presentation/2026-01-01-existing-post",
      }),
    }) as unknown as typeof fetch;

    render(
      <BlogPostEditor onSave={onSaveMock()} initialData={editInitialData} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Show Assets" }));
    expect(await screen.findByText("No assets found")).toBeInTheDocument();
    await userEvent.click(screen.getByText(/Show searched locations/));
    expect(
      screen.getByText("public/presentation/2026-01-01-existing-post/"),
    ).toBeInTheDocument();
  });

  it("'Use' sets presentationSlides and 'Insert' appends markdown to content", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        assets: [
          {
            name: "diagram.png",
            path: "x",
            url: "/x/diagram.png",
            type: "PNG",
            size: 500,
          },
        ],
      }),
    }) as unknown as typeof fetch;

    render(
      <BlogPostEditor onSave={onSaveMock()} initialData={editInitialData} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Show Assets" }));
    await screen.findByText("diagram.png");

    await userEvent.click(screen.getByRole("button", { name: "Use" }));
    expect(screen.getByLabelText(/Presentation Slides URL/)).toHaveValue(
      "diagram.png",
    );

    await userEvent.click(screen.getByRole("button", { name: "Insert" }));
    const content = await contentTextarea();
    expect(content.value).toContain(
      "![diagram.png](/presentation/2026-01-01-existing-post/diagram.png)",
    );
  });

  it("deletes an asset after confirmation and refreshes the list", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          assets: [
            {
              name: "old.png",
              path: "x",
              url: "/x/old.png",
              type: "PNG",
              size: 100,
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: "File deleted successfully" }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ assets: [] }) });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <BlogPostEditor onSave={onSaveMock()} initialData={editInitialData} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Show Assets" }));
    await screen.findByText("old.png");

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(window.alert).toHaveBeenCalledWith("File deleted successfully");
  });

  it("does not delete when the confirmation dialog is cancelled", async () => {
    window.confirm = jest.fn(() => false);
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        assets: [
          {
            name: "old.png",
            path: "x",
            url: "/x/old.png",
            type: "PNG",
            size: 100,
          },
        ],
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <BlogPostEditor onSave={onSaveMock()} initialData={editInitialData} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Show Assets" }));
    await screen.findByText("old.png");

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(fetchMock).toHaveBeenCalledTimes(1); // only the initial list fetch
  });

  it("uploads a new asset and shows the resulting PR via onPRCreated", async () => {
    jest.useFakeTimers({ advanceTimers: true });
    const onPRCreated = jest.fn();
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ assets: [] }) }) // initial list
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: "File uploaded successfully",
          pullRequest: { prNumber: 9, branchName: "fix/x", isNew: true },
        }),
      });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <BlogPostEditor
        onSave={onSaveMock()}
        initialData={editInitialData}
        onPRCreated={onPRCreated}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Show Assets" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const file = new File(["bytes"], "new.png", { type: "image/png" });
    const input = document.getElementById("asset-upload") as HTMLInputElement;
    await userEvent.upload(input, file);

    await waitFor(() =>
      expect(onPRCreated).toHaveBeenCalledWith({
        prNumber: 9,
        branchName: "fix/x",
        isNew: true,
      }),
    );
    jest.useRealTimers();
  });
});

describe("BlogPostEditor - speaker image modal", () => {
  it("opens the modal, lists images, and filters via search", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        // Name and the URL's basename intentionally differ so the table's
        // name column and subtitle column don't collide on the same text.
        images: [
          {
            name: "jane.jpg",
            url: "/images/speakers/jane-headshot.jpg",
            size: 1024,
          },
          {
            name: "amy.jpg",
            url: "/images/speakers/amy-headshot.jpg",
            size: 2048,
          },
        ],
      }),
    }) as unknown as typeof fetch;

    render(
      <BlogPostEditor onSave={onSaveMock()} initialData={editInitialData} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Browse" }));
    expect(await screen.findByText("jane.jpg")).toBeInTheDocument();
    expect(screen.getByText("amy.jpg")).toBeInTheDocument();

    await userEvent.type(
      screen.getByPlaceholderText("Search speaker images..."),
      "jane",
    );
    expect(screen.getByText("jane.jpg")).toBeInTheDocument();
    expect(screen.queryByText("amy.jpg")).not.toBeInTheDocument();
  });

  it("shows a 'no images found' row when the filter matches nothing", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        images: [{ name: "jane.jpg", url: "/x/jane-headshot.jpg", size: 100 }],
      }),
    }) as unknown as typeof fetch;
    render(
      <BlogPostEditor onSave={onSaveMock()} initialData={editInitialData} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Browse" }));
    await screen.findByText("jane.jpg");
    await userEvent.type(
      screen.getByPlaceholderText("Search speaker images..."),
      "nomatch",
    );
    expect(screen.getByText("No images found.")).toBeInTheDocument();
  });

  it("selects an existing image and closes the modal", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        images: [
          { name: "jane.jpg", url: "/images/speakers/jane.jpg", size: 100 },
        ],
      }),
    }) as unknown as typeof fetch;
    render(
      <BlogPostEditor onSave={onSaveMock()} initialData={editInitialData} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Browse" }));
    await userEvent.click(
      await screen.findByRole("button", { name: "Select" }),
    );
    expect(screen.getByLabelText(/Speaker Image/)).toHaveValue(
      "/images/speakers/jane.jpg",
    );
    expect(screen.queryByText("Select Speaker Image")).not.toBeInTheDocument();
  });

  it("closes the modal via the close (X) button", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ images: [] }),
    }) as unknown as typeof fetch;
    render(
      <BlogPostEditor onSave={onSaveMock()} initialData={editInitialData} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Browse" }));
    await screen.findByText("Select Speaker Image");
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByText("Select Speaker Image")).not.toBeInTheDocument();
  });

  it("uploads a new speaker image and auto-selects it", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ images: [] }) }) // list on open
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: "Speaker image uploaded successfully",
          file: { url: "/images/speakers/new.jpg" },
          // A pullRequest result skips the component's own delayed
          // (setTimeout-based) speaker-image refresh - without it, that
          // real 500ms timer outlives this test and can fire mid-flight
          // during a later test, corrupting its fetch call count.
          pullRequest: { prNumber: 1, branchName: "fix/x", isNew: true },
        }),
      });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <BlogPostEditor onSave={onSaveMock()} initialData={editInitialData} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Browse" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const file = new File(["bytes"], "new.jpg", { type: "image/jpeg" });
    const input = document.getElementById(
      "speaker-image-upload-modal",
    ) as HTMLInputElement;
    await userEvent.upload(input, file);

    await waitFor(() =>
      expect(screen.getByLabelText(/Speaker Image/)).toHaveValue(
        "/images/speakers/new.jpg",
      ),
    );
    expect(screen.queryByText("Select Speaker Image")).not.toBeInTheDocument();
  });

  it("ignores a speaker-image file input change event with no file selected", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ images: [] }) });
    global.fetch = fetchMock as unknown as typeof fetch;
    render(
      <BlogPostEditor onSave={onSaveMock()} initialData={editInitialData} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Browse" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const input = document.getElementById(
      "speaker-image-upload-modal",
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [] } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("BlogPostEditor - content preview", () => {
  it("renders the markdown preview via the mocked remark pipeline", async () => {
    render(
      <BlogPostEditor onSave={onSaveMock()} initialData={editInitialData} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Show Preview" }));
    await waitFor(() =>
      expect(document.querySelector(".prose")?.innerHTML).toContain(
        "Existing body",
      ),
    );
  });

  it("clears the preview when the content editor is emptied", async () => {
    render(
      <BlogPostEditor onSave={onSaveMock()} initialData={editInitialData} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Show Preview" }));
    await waitFor(() =>
      expect(document.querySelector(".prose")?.innerHTML).toContain(
        "Existing body",
      ),
    );
    fireEvent.change(await contentTextarea(), { target: { value: "" } });
    await waitFor(() =>
      expect(document.querySelector(".prose")?.innerHTML).toBe(""),
    );
  });

  it("shows an error placeholder when the markdown pipeline throws", async () => {
    mockRemarkProcess.mockRejectedValueOnce(new Error("boom"));
    jest.spyOn(console, "error").mockImplementation(() => {});
    render(
      <BlogPostEditor onSave={onSaveMock()} initialData={editInitialData} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Show Preview" }));
    await waitFor(() =>
      expect(document.querySelector(".prose")?.innerHTML).toContain(
        "Error processing markdown",
      ),
    );
  });
});

describe("BlogPostEditor - presentation/recording template buttons", () => {
  async function withTitleAndDate() {
    render(
      <BlogPostEditor onSave={onSaveMock()} initialData={editInitialData} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Show Assets" }));
  }

  it("fills presentationSlides via the Local Git Storage template", async () => {
    await withTitleAndDate();
    await userEvent.click(
      screen.getByRole("button", { name: "Local Git Storage" }),
    );
    expect(screen.getByLabelText(/Presentation Slides URL/)).toHaveValue(
      "presentation.pdf",
    );
  });

  it("fills presentationSlides via the Google Slides template", async () => {
    await withTitleAndDate();
    await userEvent.click(
      screen.getByRole("button", { name: "Google Slides Template" }),
    );
    expect(screen.getByLabelText(/Presentation Slides URL/)).toHaveValue(
      "https://docs.google.com/presentation/d/YOUR_PRESENTATION_ID/edit#slide=id.p",
    );
  });

  it("fills presentationSlides via the SlideShare template using title + date", async () => {
    await withTitleAndDate();
    await userEvent.click(
      screen.getByRole("button", { name: "SlideShare Template" }),
    );
    expect(screen.getByLabelText(/Presentation Slides URL/)).toHaveValue(
      "https://www.slideshare.net/YOUR_USERNAME/existing-post-2026-01-01",
    );
  });

  it("fills recordingUrl via the YouTube and Vimeo templates", async () => {
    await withTitleAndDate();
    await userEvent.click(
      screen.getByRole("button", { name: "YouTube Template" }),
    );
    expect(screen.getByLabelText(/Recording URL/)).toHaveValue(
      "https://www.youtube.com/watch?v=YOUR_VIDEO_ID",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Vimeo Template" }),
    );
    expect(screen.getByLabelText(/Recording URL/)).toHaveValue(
      "https://vimeo.com/YOUR_VIDEO_ID",
    );
  });

  it("does nothing for the template buttons when title or date is missing", async () => {
    render(<BlogPostEditor onSave={onSaveMock()} />); // new post, no title/date yet
    await userEvent.click(screen.getByRole("button", { name: "Show Assets" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Local Git Storage" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Google Slides Template" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "SlideShare Template" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "YouTube Template" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Vimeo Template" }),
    );
    expect(screen.getByLabelText(/Presentation Slides URL/)).toHaveValue("");
    expect(screen.getByLabelText(/Recording URL/)).toHaveValue("");
  });

  it("ignores a file input change event with no file selected", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ assets: [] }) });
    global.fetch = fetchMock as unknown as typeof fetch;
    await withTitleAndDate();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const input = document.getElementById("asset-upload") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [] } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("BlogPostEditor - Google Maps location search", () => {
  it("fills location fields from a search result on Enter", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        name: "Found Venue",
        address: "123 Main St",
        lat: "1.23",
        lng: "4.56",
      }),
    }) as unknown as typeof fetch;

    render(
      <BlogPostEditor onSave={onSaveMock()} initialData={editInitialData} />,
    );
    const input = screen.getByPlaceholderText("Search for a location...");
    await userEvent.type(input, "Some Venue{Enter}");

    await waitFor(() =>
      expect(screen.getByLabelText(/Venue Name/)).toHaveValue("Found Venue"),
    );
    expect(screen.getByLabelText(/^Address/)).toHaveValue("123 Main St");
    expect(screen.getByLabelText(/Latitude/)).toHaveValue("1.23");
    expect(screen.getByLabelText(/Longitude/)).toHaveValue("4.56");
  });

  it("fills location fields from a search result via the Search button", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        name: "Found Venue",
        address: "123 Main St",
        lat: "1.23",
        lng: "4.56",
      }),
    }) as unknown as typeof fetch;

    render(
      <BlogPostEditor onSave={onSaveMock()} initialData={editInitialData} />,
    );
    await userEvent.type(
      screen.getByPlaceholderText("Search for a location..."),
      "Some Venue",
    );
    await userEvent.click(screen.getByRole("button", { name: /Search/ }));

    await waitFor(() =>
      expect(screen.getByLabelText(/Venue Name/)).toHaveValue("Found Venue"),
    );
    expect(screen.getByLabelText(/^Address/)).toHaveValue("123 Main St");
    expect(screen.getByLabelText(/Latitude/)).toHaveValue("1.23");
    expect(screen.getByLabelText(/Longitude/)).toHaveValue("4.56");
  });

  it("alerts when the search finds no results, via the Search button", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 404 }) as unknown as typeof fetch;
    render(
      <BlogPostEditor onSave={onSaveMock()} initialData={editInitialData} />,
    );
    await userEvent.type(
      screen.getByPlaceholderText("Search for a location..."),
      "Nowhere",
    );
    await userEvent.click(screen.getByRole("button", { name: /Search/ }));
    await waitFor(() =>
      expect(window.alert).toHaveBeenCalledWith(
        "No results found for that location. Please try a different search term.",
      ),
    );
  });

  it("does nothing when Enter is pressed in the location search with an empty query", async () => {
    global.fetch = jest.fn();
    render(
      <BlogPostEditor onSave={onSaveMock()} initialData={editInitialData} />,
    );
    await userEvent.type(
      screen.getByPlaceholderText("Search for a location..."),
      "{Enter}",
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("alerts when the search button is clicked with an empty query", async () => {
    render(
      <BlogPostEditor onSave={onSaveMock()} initialData={editInitialData} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Search/ }));
    expect(window.alert).toHaveBeenCalledWith(
      "Please enter a location to search for.",
    );
  });

  it("shows the same 'no results' alert for a non-404 upstream error (exercises searchGoogleMaps' own throw+catch)", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;
    render(
      <BlogPostEditor onSave={onSaveMock()} initialData={editInitialData} />,
    );
    await userEvent.type(
      screen.getByPlaceholderText("Search for a location..."),
      "Nowhere{Enter}",
    );
    await waitFor(() =>
      expect(window.alert).toHaveBeenCalledWith(
        "No results found for that location. Please try a different search term.",
      ),
    );
  });
});

describe("BlogPostEditor - additional branch coverage", () => {
  it("formats a small asset size in bytes and falls back to 'Size unavailable' for a zero/missing size", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        assets: [
          {
            name: "tiny.txt",
            path: "x",
            url: "/x/tiny.txt",
            type: "TXT",
            size: 500,
          },
          {
            name: "empty.txt",
            path: "x",
            url: "/x/empty.txt",
            type: "TXT",
            size: 0,
          },
        ],
      }),
    }) as unknown as typeof fetch;
    render(
      <BlogPostEditor onSave={onSaveMock()} initialData={editInitialData} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Show Assets" }));
    expect(await screen.findByText("500 bytes")).toBeInTheDocument();
    expect(screen.getByText("Size unavailable")).toBeInTheDocument();
  });

  it("falls back to a title-only slug when the date field is cleared", async () => {
    render(<BlogPostEditor onSave={onSaveMock()} />);
    fireEvent.change(screen.getByLabelText(/^Date/), { target: { value: "" } });
    await userEvent.type(screen.getByLabelText(/^Title/), "Only A Title");
    await waitFor(() =>
      expect(screen.getByLabelText(/Slug/)).toHaveValue("only-a-title"),
    );
  });

  it("parses a single-document YAML rawContent with no '---' delimiters", async () => {
    const data = {
      ...editInitialData,
      rawContent: 'title: "No Delimiters"\ndate: "2026-01-01"',
    };
    render(<BlogPostEditor onSave={onSaveMock()} initialData={data} />);
    await userEvent.click(screen.getByRole("button", { name: "Show YAML" }));
    expect((await yamlTextarea()).value).toContain("No Delimiters");
  });

  it("falls back to an empty object when a single-document rawContent parses to a non-object (null)", async () => {
    const data = { ...editInitialData, rawContent: "null" };
    render(<BlogPostEditor onSave={onSaveMock()} initialData={data} />);
    await userEvent.click(screen.getByRole("button", { name: "Show YAML" }));
    expect((await yamlTextarea()).value).toBe("null");
  });

  it("falls back to an empty object when the second YAML document is blank", async () => {
    const data = {
      ...editInitialData,
      rawContent: "---\n---\n---\n   \n---\nExisting body",
    };
    render(<BlogPostEditor onSave={onSaveMock()} initialData={data} />);
    await userEvent.click(screen.getByRole("button", { name: "Show YAML" }));
    expect((await yamlTextarea()).value).toBe("");
  });

  it("falls back to basic form data when the edited raw YAML parses to null", async () => {
    const onSave = onSaveMock();
    render(<BlogPostEditor onSave={onSave} initialData={editInitialData} />);
    await userEvent.click(screen.getByRole("button", { name: "Show YAML" }));
    const yaml = await yamlTextarea();
    fireEvent.change(yaml, { target: { value: "null" } });

    await userEvent.click(
      screen.getByRole("button", { name: "Create Pull Request" }),
    );
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const { frontmatter } = onSave.mock.calls[0][0];
    expect(frontmatter).toEqual(
      expect.objectContaining({
        title: "Existing Post",
        tags: ["react", "testing"],
        published: true,
      }),
    );
  });

  it("leaves the YAML editor empty when rawContent fails to parse", async () => {
    // parseMultiDocumentYaml catches its own parse errors and returns an
    // empty rawFirstDocument rather than throwing, so the component-level
    // catch (which would dump(frontmatter) as a fallback) never actually
    // fires - this documents the real, if surprising, behavior.
    const data = {
      ...editInitialData,
      rawContent: "---\ntitle: [unterminated\n---\nbody",
    };
    render(<BlogPostEditor onSave={onSaveMock()} initialData={data} />);
    await userEvent.click(screen.getByRole("button", { name: "Show YAML" }));
    expect((await yamlTextarea()).value).toBe("");
  });

  it("reconstructs frontmatter from form data only when there is no rawContent to seed the YAML editor", async () => {
    const onSave = onSaveMock();
    const data = {
      slug: editInitialData.slug,
      frontmatter: editFrontmatter,
      content: editInitialData.content,
    };
    render(<BlogPostEditor onSave={onSave} initialData={data} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Create Pull Request" }),
    );
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const { frontmatter } = onSave.mock.calls[0][0];
    expect(frontmatter).toEqual(
      expect.objectContaining({
        title: "Existing Post",
        tags: ["react", "testing"],
        published: true,
      }),
    );
    expect(frontmatter.speakerName).toBeUndefined();
  });

  it("includes optional presentation/event fields via the no-rawContent fallback path when present", async () => {
    const onSave = onSaveMock();
    const data = {
      slug: editInitialData.slug,
      frontmatter: {
        ...editFrontmatter,
        presentationTitle: "Deep Dive",
        presentationDescription: "A longer description",
        presentationSlides: "slides.pdf",
        recordingUrl: "https://youtube.com/watch?v=abc",
        meetupEventId: "12345",
        eventDate: "2026-03-01",
        eventLocation: "123 Main St",
      },
      content: editInitialData.content,
    };
    render(<BlogPostEditor onSave={onSave} initialData={data as never} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Create Pull Request" }),
    );
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const { frontmatter } = onSave.mock.calls[0][0];
    expect(frontmatter).toEqual(
      expect.objectContaining({
        presentationTitle: "Deep Dive",
        presentationDescription: "A longer description",
        presentationSlides: "slides.pdf",
        recordingUrl: "https://youtube.com/watch?v=abc",
        meetupEventId: "12345",
        eventDate: "2026-03-01",
        eventLocation: "123 Main St",
      }),
    );
  });

  it("includes optional presentation/event fields in the reconstructed frontmatter when present", async () => {
    const onSave = onSaveMock();
    const data = {
      ...editInitialData,
      frontmatter: {
        ...editFrontmatter,
        presentationTitle: "Deep Dive",
        presentationDescription: "A longer description",
        presentationSlides: "slides.pdf",
        recordingUrl: "https://youtube.com/watch?v=abc",
        meetupEventId: "12345",
        // Legacy data shape: eventLocation as a plain string rather than
        // the modern { name, address, coordinates } object. formData only
        // ever holds a string here via getStringValue(), so this is the
        // one way to make it truthy.
        eventLocation: "123 Main St",
      },
    };
    render(<BlogPostEditor onSave={onSave} initialData={data as never} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Create Pull Request" }),
    );
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const { frontmatter } = onSave.mock.calls[0][0];
    expect(frontmatter).toEqual(
      expect.objectContaining({
        presentationTitle: "Deep Dive",
        presentationDescription: "A longer description",
        presentationSlides: "slides.pdf",
        recordingUrl: "https://youtube.com/watch?v=abc",
        meetupEventId: "12345",
        eventLocation: "123 Main St",
      }),
    );
  });

  it("forces unquoted numeric lat/lng coordinates in the raw YAML back to strings on save", async () => {
    const onSave = onSaveMock();
    const data = {
      ...editInitialData,
      rawContent: `---
title: "Existing Post"
date: "2026-01-01"
eventLocation:
  name: Venue
  coordinates:
    lat: 35.965179
    lng: -83.919846
---
Existing body`,
    };
    render(<BlogPostEditor onSave={onSave} initialData={data} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Create Pull Request" }),
    );
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const { frontmatter } = onSave.mock.calls[0][0] as {
      frontmatter: {
        eventLocation: { coordinates: { lat: unknown; lng: unknown } };
      };
    };
    expect(frontmatter.eventLocation.coordinates.lat).toBe("35.965179");
    expect(frontmatter.eventLocation.coordinates.lng).toBe("-83.919846");
  });

  it("omits eventDate from the reconstructed frontmatter when the field is cleared", async () => {
    const onSave = onSaveMock();
    const data = {
      ...editInitialData,
      frontmatter: { ...editFrontmatter, eventDate: "2026-03-01" },
    };
    render(<BlogPostEditor onSave={onSave} initialData={data} />);
    fireEvent.change(screen.getByLabelText("Event Date"), {
      target: { value: "" },
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Create Pull Request" }),
    );
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const { frontmatter } = onSave.mock.calls[0][0];
    expect(frontmatter.eventDate).toBeUndefined();
  });

  it("falls back to basic form data when the edited raw YAML fails to parse at save time", async () => {
    // Unlike the initial rawContent parse (which swallows its own errors -
    // see the "no delimiters" test above), directly editing the YAML editor
    // to invalid YAML and then saving hits reconstructYamlContent's own
    // load() call, which throws synchronously and is caught here.
    const onSave = onSaveMock();
    jest.spyOn(console, "error").mockImplementation(() => {});
    render(<BlogPostEditor onSave={onSave} initialData={editInitialData} />);
    await userEvent.click(screen.getByRole("button", { name: "Show YAML" }));
    const yaml = await yamlTextarea();
    fireEvent.change(yaml, { target: { value: "title: [unterminated" } });

    await userEvent.click(
      screen.getByRole("button", { name: "Create Pull Request" }),
    );
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const { frontmatter } = onSave.mock.calls[0][0];
    expect(frontmatter).toEqual(
      expect.objectContaining({
        title: "Existing Post",
        tags: ["react", "testing"],
        published: true,
      }),
    );
    expect(frontmatter.presentationTitle).toBeUndefined();
  });

  it("alerts on a non-ok asset upload response and on a network failure", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ assets: [] }) }) // list
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "too big" }),
      }) // upload fails
      .mockRejectedValueOnce(new Error("network down")); // second upload throws
    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <BlogPostEditor onSave={onSaveMock()} initialData={editInitialData} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Show Assets" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const input = document.getElementById("asset-upload") as HTMLInputElement;
    await userEvent.upload(
      input,
      new File(["x"], "a.png", { type: "image/png" }),
    );
    await waitFor(() =>
      expect(window.alert).toHaveBeenCalledWith("Upload failed: too big"),
    );

    await userEvent.upload(
      input,
      new File(["x"], "b.png", { type: "image/png" }),
    );
    await waitFor(() =>
      expect(window.alert).toHaveBeenCalledWith(
        "Upload failed. Please try again.",
      ),
    );
  });

  it("falls back to a generic message when the upload error response has no error string", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ assets: [] }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <BlogPostEditor onSave={onSaveMock()} initialData={editInitialData} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Show Assets" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const input = document.getElementById("asset-upload") as HTMLInputElement;
    await userEvent.upload(
      input,
      new File(["x"], "a.png", { type: "image/png" }),
    );
    await waitFor(() =>
      expect(window.alert).toHaveBeenCalledWith("Upload failed: Unknown error"),
    );
  });

  it("alerts with the PR number when deleting an asset creates a pull request", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          assets: [
            { name: "a.png", path: "x", url: "/x/a.png", type: "PNG", size: 1 },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: "Deleted",
          pullRequest: { prNumber: 42 },
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ assets: [] }) });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <BlogPostEditor onSave={onSaveMock()} initialData={editInitialData} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Show Assets" }));
    await screen.findByText("a.png");
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(window.alert).toHaveBeenCalledWith("Deleted (PR #42)"),
    );
  });

  it("falls back to a generic message when the delete error response has no error string", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          assets: [
            { name: "a.png", path: "x", url: "/x/a.png", type: "PNG", size: 1 },
          ],
        }),
      })
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <BlogPostEditor onSave={onSaveMock()} initialData={editInitialData} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Show Assets" }));
    await screen.findByText("a.png");
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(window.alert).toHaveBeenCalledWith("Delete failed: Unknown error"),
    );
  });

  it("alerts on a non-ok asset delete response and on a network failure", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          assets: [
            { name: "a.png", path: "x", url: "/x/a.png", type: "PNG", size: 1 },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "locked" }),
      })
      .mockRejectedValueOnce(new Error("network down"));
    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <BlogPostEditor onSave={onSaveMock()} initialData={editInitialData} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Show Assets" }));
    await screen.findByText("a.png");

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(window.alert).toHaveBeenCalledWith("Delete failed: locked"),
    );

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(window.alert).toHaveBeenCalledWith(
        "Delete failed. Please try again.",
      ),
    );
  });

  it("clears speaker images on a non-ok list response and on a network failure", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Server Error",
      })
      .mockRejectedValueOnce(new Error("network down"));
    global.fetch = fetchMock as unknown as typeof fetch;
    render(
      <BlogPostEditor onSave={onSaveMock()} initialData={editInitialData} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Browse" }));
    expect(await screen.findByText("No images found.")).toBeInTheDocument();

    // Close (via a click on the overlay, not just Escape) and reopen to
    // trigger a second fetchSpeakerImages call, this time hitting the
    // network-failure catch branch.
    await userEvent.click(screen.getByRole("button", { name: "Close modal" }));
    expect(screen.queryByText("Select Speaker Image")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Browse" }));
    expect(await screen.findByText("No images found.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("defaults to an empty speaker image list when the response omits images", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    }) as unknown as typeof fetch;
    render(
      <BlogPostEditor onSave={onSaveMock()} initialData={editInitialData} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Browse" }));
    expect(await screen.findByText("No images found.")).toBeInTheDocument();
  });

  it("falls back to a generic message when the speaker image upload error response has no error string", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ images: [] }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    global.fetch = fetchMock as unknown as typeof fetch;
    render(
      <BlogPostEditor onSave={onSaveMock()} initialData={editInitialData} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Browse" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const input = document.getElementById(
      "speaker-image-upload-modal",
    ) as HTMLInputElement;
    await userEvent.upload(
      input,
      new File(["x"], "a.jpg", { type: "image/jpeg" }),
    );
    await waitFor(() =>
      expect(window.alert).toHaveBeenCalledWith("Upload failed: Unknown error"),
    );
  });

  it("does not close the speaker image modal on a non-Escape key", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ images: [] }),
    }) as unknown as typeof fetch;
    render(
      <BlogPostEditor onSave={onSaveMock()} initialData={editInitialData} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Browse" }));
    await screen.findByText("Select Speaker Image");
    fireEvent.keyDown(screen.getByRole("button", { name: "Close modal" }), {
      key: "Enter",
    });
    expect(screen.getByText("Select Speaker Image")).toBeInTheDocument();
  });

  it("calls onPRCreated when a speaker image upload creates a pull request", async () => {
    const onPRCreated = jest.fn();
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ images: [] }) }) // list on open
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: "Speaker image uploaded successfully",
          file: { url: "/images/speakers/new.jpg" },
          pullRequest: { prNumber: 11, branchName: "fix/y", isNew: true },
        }),
      });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <BlogPostEditor
        onSave={onSaveMock()}
        initialData={editInitialData}
        onPRCreated={onPRCreated}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Browse" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const input = document.getElementById(
      "speaker-image-upload-modal",
    ) as HTMLInputElement;
    await userEvent.upload(
      input,
      new File(["x"], "new.jpg", { type: "image/jpeg" }),
    );

    await waitFor(() =>
      expect(onPRCreated).toHaveBeenCalledWith({
        prNumber: 11,
        branchName: "fix/y",
        isNew: true,
      }),
    );
  });

  it("alerts on a non-ok speaker image upload response and on a network failure", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ images: [] }) }) // list on open
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "bad file" }),
      })
      .mockRejectedValueOnce(new Error("network down"));
    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <BlogPostEditor onSave={onSaveMock()} initialData={editInitialData} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Browse" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const input = document.getElementById(
      "speaker-image-upload-modal",
    ) as HTMLInputElement;
    await userEvent.upload(
      input,
      new File(["x"], "a.jpg", { type: "image/jpeg" }),
    );
    await waitFor(() =>
      expect(window.alert).toHaveBeenCalledWith("Upload failed: bad file"),
    );

    await userEvent.upload(
      input,
      new File(["x"], "b.jpg", { type: "image/jpeg" }),
    );
    await waitFor(() =>
      expect(window.alert).toHaveBeenCalledWith(
        "Upload failed. Please try again.",
      ),
    );
  });

  it("alerts when trying to upload an asset or speaker image before a slug exists", async () => {
    render(<BlogPostEditor onSave={onSaveMock()} />);
    fireEvent.change(screen.getByLabelText(/^Date/), { target: { value: "" } });
    await userEvent.click(screen.getByRole("button", { name: "Show Assets" }));

    const assetInput = document.getElementById(
      "asset-upload",
    ) as HTMLInputElement;
    await userEvent.upload(
      assetInput,
      new File(["x"], "a.png", { type: "image/png" }),
    );
    expect(window.alert).toHaveBeenCalledWith(
      "Please enter a title and date to generate a slug before uploading assets.",
    );

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ images: [] }),
    }) as unknown as typeof fetch;
    await userEvent.click(screen.getByRole("button", { name: "Browse" }));
    const speakerInput = document.getElementById(
      "speaker-image-upload-modal",
    ) as HTMLInputElement;
    await userEvent.upload(
      speakerInput,
      new File(["x"], "a.jpg", { type: "image/jpeg" }),
    );
    expect(window.alert).toHaveBeenCalledWith(
      "Please enter a title and date to generate a slug before uploading speaker images.",
    );
  });

  it("clicking Refresh with no slug yet still resolves to the empty-assets branch without fetching", async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    render(<BlogPostEditor onSave={onSaveMock()} />);
    fireEvent.change(screen.getByLabelText(/^Date/), { target: { value: "" } });
    await userEvent.click(screen.getByRole("button", { name: "Show Assets" }));
    await userEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      screen.getByText("Enter title and date to browse assets"),
    ).toBeInTheDocument();
  });

  it("clears assets when the list response is not ok", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      statusText: "Server Error",
    }) as unknown as typeof fetch;
    render(
      <BlogPostEditor onSave={onSaveMock()} initialData={editInitialData} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Show Assets" }));
    expect(await screen.findByText("No assets found")).toBeInTheDocument();
  });

  it("refreshes assets on a delayed timer after an upload with no PR created", async () => {
    jest.useFakeTimers({ advanceTimers: true });
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ assets: [] }) }) // initial list
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: "File uploaded successfully" }),
      }) // upload, no PR
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          assets: [
            {
              name: "new.png",
              path: "x",
              url: "/x/new.png",
              type: "PNG",
              size: 1,
            },
          ],
        }),
      }); // refresh
    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <BlogPostEditor onSave={onSaveMock()} initialData={editInitialData} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Show Assets" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const input = document.getElementById("asset-upload") as HTMLInputElement;
    await userEvent.upload(
      input,
      new File(["x"], "new.png", { type: "image/png" }),
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    jest.advanceTimersByTime(1000);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(await screen.findByText("new.png")).toBeInTheDocument();
    jest.useRealTimers();
  });

  it("refreshes speaker images on a delayed timer after an upload with no PR created", async () => {
    jest.useFakeTimers({ advanceTimers: true });
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ images: [] }) }) // list on open
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: "Speaker image uploaded successfully",
          file: { url: "/images/speakers/new.jpg" },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          images: [
            { name: "new.jpg", url: "/images/speakers/new.jpg", size: 1 },
          ],
        }),
      });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <BlogPostEditor onSave={onSaveMock()} initialData={editInitialData} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Browse" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const input = document.getElementById(
      "speaker-image-upload-modal",
    ) as HTMLInputElement;
    await userEvent.upload(
      input,
      new File(["x"], "new.jpg", { type: "image/jpeg" }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    jest.useRealTimers();
  });

  it("closes the speaker image modal on Escape from the overlay", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ images: [] }),
    }) as unknown as typeof fetch;
    render(
      <BlogPostEditor onSave={onSaveMock()} initialData={editInitialData} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Browse" }));
    await screen.findByText("Select Speaker Image");
    fireEvent.keyDown(screen.getByRole("button", { name: "Close modal" }), {
      key: "Escape",
    });
    expect(screen.queryByText("Select Speaker Image")).not.toBeInTheDocument();
  });
});

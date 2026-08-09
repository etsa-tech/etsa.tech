/**
 * @jest-environment jsdom
 */
import { useEffect } from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import EditPostPage from "@/app/admin/posts/[slug]/edit/page";
import { AdminProvider, useAdmin } from "@/contexts/AdminContext";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
  useSearchParams: jest.fn(),
}));

let editorProps: {
  initialData: { frontmatter: Record<string, unknown> };
  onSave: (data: {
    slug: string;
    frontmatter: object;
    content: string;
    createPR: boolean;
  }) => void;
  onPRCreated: (info: {
    prNumber: number;
    branchName: string;
    isNew: boolean;
  }) => void;
} | null = null;

jest.mock("@/components/admin/BlogPostEditor", () => ({
  __esModule: true,
  default: (props: never) => {
    editorProps = props as never;
    return <div data-testid="editor" />;
  },
}));

const mockedUseRouter = jest.mocked(useRouter);
const mockedUseParams = jest.mocked(useParams);
const mockedUseSearchParams = jest.mocked(useSearchParams);
const originalFetch = global.fetch;
const push = jest.fn();

function renderPage() {
  return render(
    <AdminProvider>
      <EditPostPage />
    </AdminProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  mockedUseRouter.mockReturnValue({ push } as never);
  mockedUseParams.mockReturnValue({ slug: "my-post" } as never);
  mockedUseSearchParams.mockReturnValue(new URLSearchParams() as never);
  push.mockClear();
  editorProps = null;
});

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body };
}

describe("EditPostPage", () => {
  it("does not fetch when slug is empty", () => {
    mockedUseParams.mockReturnValue({} as never);
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    renderPage();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("skips the update-branch check when there are no available branches", async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes("/pr"))
        return Promise.resolve(jsonResponse({ openPR: null }));
      return Promise.resolve(
        jsonResponse({
          slug: "my-post",
          frontmatter: { title: "My Post" },
          content: "body",
        }),
      );
    }) as unknown as typeof fetch;

    function Harness() {
      const { setAvailableBranches } = useAdmin();
      useEffect(() => {
        setAvailableBranches([]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return <EditPostPage />;
    }
    render(
      <AdminProvider>
        <Harness />
      </AdminProvider>,
    );
    expect(
      await screen.findByRole("heading", { name: /Edit Blog Post/ }),
    ).toBeInTheDocument();
  });

  it("falls back to 'Untitled' when the post has no title", async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes("/pr"))
        return Promise.resolve(jsonResponse({ openPR: null }));
      return Promise.resolve(
        jsonResponse({ slug: "my-post", frontmatter: {}, content: "body" }),
      );
    }) as unknown as typeof fetch;
    renderPage();
    expect(
      await screen.findByRole("heading", { name: /Edit Blog Post: Untitled/ }),
    ).toBeInTheDocument();
  });

  it("shows a fallback save-error message when the PUT response fails without an error string", async () => {
    global.fetch = jest
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes("/pr"))
          return Promise.resolve(jsonResponse({ openPR: null }));
        if (init?.method === "PUT")
          return Promise.resolve(jsonResponse({}, false));
        return Promise.resolve(
          jsonResponse({
            slug: "my-post",
            frontmatter: { title: "My Post" },
            content: "body",
          }),
        );
      }) as unknown as typeof fetch;
    jest.spyOn(console, "error").mockImplementation(() => {});
    renderPage();
    await screen.findByRole("heading", { name: /Edit Blog Post/ });
    await act(async () =>
      editorProps!.onSave({
        slug: "my-post",
        frontmatter: {},
        content: "x",
        createPR: false,
      }),
    );
    expect(
      await screen.findByText("Failed to update post"),
    ).toBeInTheDocument();
  });

  it("shows a fallback save-error message when the save request itself throws a non-Error", async () => {
    global.fetch = jest
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes("/pr"))
          return Promise.resolve(jsonResponse({ openPR: null }));
        if (init?.method === "PUT") return Promise.reject("network down");
        return Promise.resolve(
          jsonResponse({
            slug: "my-post",
            frontmatter: { title: "My Post" },
            content: "body",
          }),
        );
      }) as unknown as typeof fetch;
    jest.spyOn(console, "error").mockImplementation(() => {});
    renderPage();
    await screen.findByRole("heading", { name: /Edit Blog Post/ });
    await act(async () =>
      editorProps!.onSave({
        slug: "my-post",
        frontmatter: {},
        content: "x",
        createPR: false,
      }),
    );
    expect(
      await screen.findByText("Failed to update post"),
    ).toBeInTheDocument();
  });

  it("creates a PR without a branch name and does not show a branch-switch message", async () => {
    global.fetch = jest
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes("/pr"))
          return Promise.resolve(jsonResponse({ openPR: null }));
        if (init?.method === "PUT") {
          return Promise.resolve(jsonResponse({ prNumber: 4, isNewPR: true }));
        }
        return Promise.resolve(
          jsonResponse({
            slug: "my-post",
            frontmatter: { title: "My Post" },
            content: "body",
          }),
        );
      }) as unknown as typeof fetch;
    renderPage();
    await screen.findByRole("heading", { name: /Edit Blog Post/ });
    await act(async () =>
      editorProps!.onSave({
        slug: "my-post",
        frontmatter: {},
        content: "x",
        createPR: true,
      }),
    );
    expect(
      await screen.findByText("Pull request #4 created successfully!"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Switching to PR branch/),
    ).not.toBeInTheDocument();
  });

  it("handles a PR created via asset upload for a brand-new PR", async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes("/pr"))
        return Promise.resolve(jsonResponse({ openPR: null }));
      return Promise.resolve(
        jsonResponse({
          slug: "my-post",
          frontmatter: { title: "My Post" },
          content: "body",
        }),
      );
    }) as unknown as typeof fetch;
    renderPage();
    await screen.findByRole("heading", { name: /Edit Blog Post/ });
    await act(async () =>
      editorProps!.onPRCreated({
        prNumber: 3,
        branchName: "fix/y",
        isNew: true,
      }),
    );
    expect(
      await screen.findByText("This post has an open pull request #3"),
    ).toBeInTheDocument();
  });

  it("shows a not-found message when the post fails to load", async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes("/pr"))
        return Promise.resolve(jsonResponse({ openPR: null }));
      return Promise.resolve(jsonResponse({ error: "missing" }, false));
    }) as unknown as typeof fetch;
    jest.spyOn(console, "error").mockImplementation(() => {});
    renderPage();
    expect(await screen.findByText("Post not found")).toBeInTheDocument();
  });

  it("loads the post and passes it to the editor, showing the Mailchimp link for a presentation", async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes("/pr"))
        return Promise.resolve(jsonResponse({ openPR: null }));
      return Promise.resolve(
        jsonResponse({
          slug: "my-post",
          frontmatter: { title: "My Post", blogpost: false },
          content: "body",
        }),
      );
    }) as unknown as typeof fetch;
    renderPage();
    expect(
      await screen.findByRole("heading", { name: /Edit Blog Post: My Post/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Mailchimp announcement/ }),
    ).toHaveAttribute("href", "/admin/posts/my-post/social");
  });

  it("hides the Mailchimp announcement link for a blog post", async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes("/pr"))
        return Promise.resolve(jsonResponse({ openPR: null }));
      return Promise.resolve(
        jsonResponse({
          slug: "my-post",
          frontmatter: { title: "My Post", blogpost: true },
          content: "body",
        }),
      );
    }) as unknown as typeof fetch;
    renderPage();
    await screen.findByRole("heading", { name: /Edit Blog Post/ });
    expect(
      screen.queryByRole("link", { name: /Mailchimp announcement/ }),
    ).not.toBeInTheDocument();
  });

  it("uses the PR branch and shows the branch selector when an open PR exists", async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes("/pr")) {
        return Promise.resolve(
          jsonResponse({ openPR: { branchName: "fix/my-post", prNumber: 9 } }),
        );
      }
      return Promise.resolve(
        jsonResponse({
          slug: "my-post",
          frontmatter: { title: "My Post" },
          content: "body",
        }),
      );
    }) as unknown as typeof fetch;
    renderPage();
    expect(
      await screen.findByText("This post has an open pull request #9"),
    ).toBeInTheDocument();
    expect(screen.getByText("fix/my-post")).toBeInTheDocument();
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("branch=fix%2Fmy-post"),
      ),
    );
  });

  it("prefers the branch URL param over the PR branch", async () => {
    mockedUseSearchParams.mockReturnValue(
      new URLSearchParams("branch=custom-branch") as never,
    );
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes("/pr")) {
        return Promise.resolve(
          jsonResponse({ openPR: { branchName: "fix/my-post", prNumber: 9 } }),
        );
      }
      return Promise.resolve(
        jsonResponse({
          slug: "my-post",
          frontmatter: { title: "My Post" },
          content: "body",
        }),
      );
    }) as unknown as typeof fetch;
    renderPage();
    await screen.findByRole("heading", { name: /Edit Blog Post/ });
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("branch=custom-branch"),
      ),
    );
  });

  it("switching the 'View from' selector re-fetches from the new branch", async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes("/pr")) {
        return Promise.resolve(
          jsonResponse({ openPR: { branchName: "fix/my-post", prNumber: 9 } }),
        );
      }
      return Promise.resolve(
        jsonResponse({
          slug: "my-post",
          frontmatter: { title: "My Post" },
          content: "body",
        }),
      );
    }) as unknown as typeof fetch;
    renderPage();
    await screen.findByRole("heading", { name: /Edit Blog Post/ });
    await userEvent.selectOptions(screen.getByLabelText("View from:"), "main");
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("branch=main"),
      ),
    );
  });

  it("uses the branch URL param when there is no open PR", async () => {
    mockedUseSearchParams.mockReturnValue(
      new URLSearchParams("branch=custom-branch") as never,
    );
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes("/pr"))
        return Promise.resolve(jsonResponse({ openPR: null }));
      return Promise.resolve(
        jsonResponse({
          slug: "my-post",
          frontmatter: { title: "My Post" },
          content: "body",
        }),
      );
    }) as unknown as typeof fetch;
    renderPage();
    await screen.findByRole("heading", { name: /Edit Blog Post/ });
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("branch=custom-branch"),
      ),
    );
  });

  it("falls back to the selected branch when the PR check response is not ok", async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes("/pr")) return Promise.resolve(jsonResponse({}, false));
      return Promise.resolve(
        jsonResponse({
          slug: "my-post",
          frontmatter: { title: "My Post" },
          content: "body",
        }),
      );
    }) as unknown as typeof fetch;
    renderPage();
    await screen.findByRole("heading", { name: /Edit Blog Post/ });
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("branch=main"),
      ),
    );
  });

  it("uses the branch URL param when the PR check response is not ok", async () => {
    mockedUseSearchParams.mockReturnValue(
      new URLSearchParams("branch=custom-branch") as never,
    );
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes("/pr")) return Promise.resolve(jsonResponse({}, false));
      return Promise.resolve(
        jsonResponse({
          slug: "my-post",
          frontmatter: { title: "My Post" },
          content: "body",
        }),
      );
    }) as unknown as typeof fetch;
    renderPage();
    await screen.findByRole("heading", { name: /Edit Blog Post/ });
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("branch=custom-branch"),
      ),
    );
  });

  it("falls back to the selected branch when the PR check request throws", async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes("/pr")) return Promise.reject(new Error("network down"));
      return Promise.resolve(
        jsonResponse({
          slug: "my-post",
          frontmatter: { title: "My Post" },
          content: "body",
        }),
      );
    }) as unknown as typeof fetch;
    jest.spyOn(console, "error").mockImplementation(() => {});
    renderPage();
    await screen.findByRole("heading", { name: /Edit Blog Post/ });
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("branch=main"),
      ),
    );
  });

  it("uses the branch URL param when the PR check request throws", async () => {
    mockedUseSearchParams.mockReturnValue(
      new URLSearchParams("branch=custom-branch") as never,
    );
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes("/pr")) return Promise.reject(new Error("network down"));
      return Promise.resolve(
        jsonResponse({
          slug: "my-post",
          frontmatter: { title: "My Post" },
          content: "body",
        }),
      );
    }) as unknown as typeof fetch;
    jest.spyOn(console, "error").mockImplementation(() => {});
    renderPage();
    await screen.findByRole("heading", { name: /Edit Blog Post/ });
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("branch=custom-branch"),
      ),
    );
  });

  it("auto-switches from main to an existing update branch for this post", async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes("/pr"))
        return Promise.resolve(jsonResponse({ openPR: null }));
      return Promise.resolve(
        jsonResponse({
          slug: "my-post",
          frontmatter: { title: "My Post" },
          content: "body",
        }),
      );
    }) as unknown as typeof fetch;

    function Harness() {
      const { setAvailableBranches } = useAdmin();
      useEffect(() => {
        setAvailableBranches(["main", "update-post-my-post-123"]);
      }, [setAvailableBranches]);
      return <EditPostPage />;
    }
    render(
      <AdminProvider>
        <Harness />
      </AdminProvider>,
    );
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("branch=update-post-my-post-123"),
      ),
    );
  });

  it("switches back to main when on a different post's update branch", async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes("/pr"))
        return Promise.resolve(jsonResponse({ openPR: null }));
      return Promise.resolve(
        jsonResponse({
          slug: "my-post",
          frontmatter: { title: "My Post" },
          content: "body",
        }),
      );
    }) as unknown as typeof fetch;

    function Harness() {
      const { setAvailableBranches, setSelectedBranch } = useAdmin();
      // Mount-only: setSelectedBranch's identity changes on every
      // AdminProvider render (it's not memoized), so depending on it here
      // would re-fire this effect every render and fight the edit page's
      // own branch-switching effect, causing an infinite update loop.
      useEffect(() => {
        setSelectedBranch("update-post-other-post-456");
        setAvailableBranches(["main", "update-post-other-post-456"]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return <EditPostPage />;
    }
    render(
      <AdminProvider>
        <Harness />
      </AdminProvider>,
    );
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("branch=main"),
      ),
    );
  });

  it("saves to the open PR branch when 'Save to PR' is used", async () => {
    global.fetch = jest
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes("/pr")) {
          return Promise.resolve(
            jsonResponse({
              openPR: { branchName: "fix/my-post", prNumber: 9 },
            }),
          );
        }
        if (init?.method === "PUT") {
          return Promise.resolve(
            jsonResponse({
              prNumber: 9,
              isNewPR: false,
              branchName: "fix/my-post",
            }),
          );
        }
        return Promise.resolve(
          jsonResponse({
            slug: "my-post",
            frontmatter: { title: "My Post" },
            content: "body",
          }),
        );
      }) as unknown as typeof fetch;
    renderPage();
    await screen.findByRole("heading", { name: /Edit Blog Post/ });

    await act(async () =>
      editorProps!.onSave({
        slug: "my-post",
        frontmatter: {},
        content: "x",
        createPR: true,
      }),
    );
    expect(
      await screen.findByText(
        "Changes saved to existing pull request #9! Switching to PR branch...",
      ),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("branch=fix%2Fmy-post"),
        expect.objectContaining({ method: "PUT" }),
      ),
    );
  });

  it("saves to the currently-viewed branch when it differs from the selected branch", async () => {
    global.fetch = jest
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes("/pr")) {
          return Promise.resolve(
            jsonResponse({
              openPR: { branchName: "fix/my-post", prNumber: 9 },
            }),
          );
        }
        if (init?.method === "PUT") {
          return Promise.resolve(jsonResponse({ success: true }));
        }
        return Promise.resolve(
          jsonResponse({
            slug: "my-post",
            frontmatter: { title: "My Post" },
            content: "body",
          }),
        );
      }) as unknown as typeof fetch;
    renderPage();
    await screen.findByRole("heading", { name: /Edit Blog Post/ });
    // viewBranch defaults to the PR branch (fix/my-post) while selectedBranch
    // stays "main" - a non-createPR save should target the viewed branch.
    await act(async () =>
      editorProps!.onSave({
        slug: "my-post",
        frontmatter: {},
        content: "x",
        createPR: false,
      }),
    );
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("branch=fix%2Fmy-post"),
        expect.objectContaining({ method: "PUT" }),
      ),
    );
  });

  it("saves via PUT and redirects to the posts list for a direct save", async () => {
    jest.useFakeTimers({ advanceTimers: true });
    global.fetch = jest
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes("/pr"))
          return Promise.resolve(jsonResponse({ openPR: null }));
        if (init?.method === "PUT") {
          return Promise.resolve(jsonResponse({ success: true }));
        }
        return Promise.resolve(
          jsonResponse({
            slug: "my-post",
            frontmatter: { title: "My Post" },
            content: "body",
          }),
        );
      }) as unknown as typeof fetch;
    renderPage();
    await screen.findByRole("heading", { name: /Edit Blog Post/ });

    await act(async () =>
      editorProps!.onSave({
        slug: "my-post",
        frontmatter: {},
        content: "x",
        createPR: false,
      }),
    );
    expect(
      await screen.findByText("Post updated successfully!"),
    ).toBeInTheDocument();

    act(() => jest.advanceTimersByTime(2000));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/posts"));
    jest.useRealTimers();
  });

  it("creates a PR, switches to the PR branch via URL, and shows the switching message", async () => {
    jest.useFakeTimers({ advanceTimers: true });
    global.fetch = jest
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes("/pr"))
          return Promise.resolve(jsonResponse({ openPR: null }));
        if (init?.method === "PUT") {
          return Promise.resolve(
            jsonResponse({
              prNumber: 4,
              isNewPR: true,
              branchName: "fix/my-post",
            }),
          );
        }
        return Promise.resolve(
          jsonResponse({
            slug: "my-post",
            frontmatter: { title: "My Post" },
            content: "body",
          }),
        );
      }) as unknown as typeof fetch;
    renderPage();
    await screen.findByRole("heading", { name: /Edit Blog Post/ });

    await act(async () =>
      editorProps!.onSave({
        slug: "my-post",
        frontmatter: {},
        content: "x",
        createPR: true,
      }),
    );
    expect(
      await screen.findByText(/Switching to PR branch/),
    ).toBeInTheDocument();

    act(() => jest.advanceTimersByTime(1000));
    await waitFor(() => expect(push).toHaveBeenCalled());
    jest.useRealTimers();
  });

  it("shows an error message when saving fails", async () => {
    global.fetch = jest
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes("/pr"))
          return Promise.resolve(jsonResponse({ openPR: null }));
        if (init?.method === "PUT")
          return Promise.resolve(jsonResponse({ error: "conflict" }, false));
        return Promise.resolve(
          jsonResponse({
            slug: "my-post",
            frontmatter: { title: "My Post" },
            content: "body",
          }),
        );
      }) as unknown as typeof fetch;
    jest.spyOn(console, "error").mockImplementation(() => {});
    renderPage();
    await screen.findByRole("heading", { name: /Edit Blog Post/ });
    await act(async () =>
      editorProps!.onSave({
        slug: "my-post",
        frontmatter: {},
        content: "x",
        createPR: false,
      }),
    );
    expect(await screen.findByText("conflict")).toBeInTheDocument();
  });

  it("handles a PR created via asset upload, switching the viewed branch", async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes("/pr"))
        return Promise.resolve(jsonResponse({ openPR: null }));
      return Promise.resolve(
        jsonResponse({
          slug: "my-post",
          frontmatter: { title: "My Post" },
          content: "body",
        }),
      );
    }) as unknown as typeof fetch;
    renderPage();
    await screen.findByRole("heading", { name: /Edit Blog Post/ });
    await act(async () =>
      editorProps!.onPRCreated({
        prNumber: 2,
        branchName: "fix/x",
        isNew: false,
      }),
    );
    // The success message set here is immediately cleared by the
    // branch-change effect's re-fetch (which resets message on success),
    // so the durable, observable outcome is the openPR banner switching to
    // the new branch rather than the transient message text.
    expect(
      await screen.findByText("This post has an open pull request #2"),
    ).toBeInTheDocument();
    expect(screen.getByText("fix/x")).toBeInTheDocument();
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("branch=fix%2Fx"),
      ),
    );
  });
});

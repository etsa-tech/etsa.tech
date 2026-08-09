/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor, act } from "@testing-library/react";
import { useRouter } from "next/navigation";
import NewPostPage from "@/app/admin/posts/new/page";

jest.mock("next/navigation", () => ({ useRouter: jest.fn() }));

let editorProps: {
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
const originalFetch = global.fetch;
const push = jest.fn();

beforeEach(() => {
  mockedUseRouter.mockReturnValue({ push } as never);
  push.mockClear();
});

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

describe("NewPostPage", () => {
  it("creates a new post via POST and redirects to the posts list when createPR is false", async () => {
    jest.useFakeTimers({ advanceTimers: true });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ slug: "my-post" }),
    }) as unknown as typeof fetch;
    render(<NewPostPage />);

    await act(async () =>
      editorProps!.onSave({
        slug: "my-post",
        frontmatter: {},
        content: "x",
        createPR: false,
      }),
    );
    expect(
      await screen.findByText("Post created successfully!"),
    ).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/admin/posts/new",
      expect.objectContaining({ method: "POST" }),
    );

    act(() => jest.advanceTimersByTime(2000));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/posts"));
    jest.useRealTimers();
  });

  it("creates a PR and redirects to the edit page with the branch param", async () => {
    jest.useFakeTimers({ advanceTimers: true });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        prNumber: 5,
        slug: "my-post",
        branchName: "feature/my-post",
      }),
    }) as unknown as typeof fetch;
    render(<NewPostPage />);

    await act(async () =>
      editorProps!.onSave({
        slug: "my-post",
        frontmatter: {},
        content: "x",
        createPR: true,
      }),
    );
    expect(
      await screen.findByText("Pull request #5 created successfully!"),
    ).toBeInTheDocument();

    act(() => jest.advanceTimersByTime(1500));
    expect(
      await screen.findByText("Redirecting to edit page..."),
    ).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(500));
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(
        "/admin/posts/my-post/edit?branch=feature%2Fmy-post",
      ),
    );
    jest.useRealTimers();
  });

  it("shows an error message when the save fails", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "GitHub is down" }),
    }) as unknown as typeof fetch;
    jest.spyOn(console, "error").mockImplementation(() => {});
    render(<NewPostPage />);
    await act(async () =>
      editorProps!.onSave({
        slug: "x",
        frontmatter: {},
        content: "x",
        createPR: false,
      }),
    );
    expect(await screen.findByText("GitHub is down")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("switches to the PR branch and shows a message when an asset upload creates a PR", async () => {
    render(<NewPostPage />);
    await act(async () =>
      editorProps!.onPRCreated({
        prNumber: 3,
        branchName: "fix/x",
        isNew: true,
      }),
    );
    expect(
      await screen.findByText(/Created PR #3\. Switched to PR branch\./),
    ).toBeInTheDocument();
  });

  it("saves to the existing PR branch via PUT when an open PR and viewing branch are set", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ isNewPR: false, prNumber: 3 }),
    }) as unknown as typeof fetch;
    render(<NewPostPage />);
    // First simulate an asset-upload-created PR to populate openPR/viewingBranch.
    await act(async () =>
      editorProps!.onPRCreated({
        prNumber: 3,
        branchName: "fix/x",
        isNew: true,
      }),
    );
    await screen.findByText(/Switched to PR branch/);

    await act(async () =>
      editorProps!.onSave({
        slug: "my-post",
        frontmatter: {},
        content: "x",
        createPR: true,
      }),
    );
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/posts/my-post?branch=fix%2Fx",
        expect.objectContaining({ method: "PUT" }),
      ),
    );
    expect(
      await screen.findByText("Changes saved to existing pull request #3!"),
    ).toBeInTheDocument();
  });
});

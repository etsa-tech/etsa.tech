/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import BlogPostsPage from "@/app/admin/posts/page";
import { AdminProvider } from "@/contexts/AdminContext";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

function renderPage() {
  return render(
    <AdminProvider>
      <BlogPostsPage />
    </AdminProvider>,
  );
}

describe("BlogPostsPage (admin)", () => {
  it("fetches posts for the selected branch and renders the table", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ posts: [] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    renderPage();
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/posts?branch=main"),
      ),
    );
    expect(await screen.findByText("No blog posts")).toBeInTheDocument();
  });

  it("shows an error message when the fetch fails", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false });
    jest.spyOn(console, "error").mockImplementation(() => {});
    renderPage();
    expect(await screen.findByText("Error Loading Posts")).toBeInTheDocument();
  });

  it("falls back to an empty post list when the response omits posts", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    renderPage();
    expect(await screen.findByText("No blog posts")).toBeInTheDocument();
  });
});

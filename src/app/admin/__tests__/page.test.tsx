/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import AdminDashboard from "@/app/admin/page";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

describe("AdminDashboard", () => {
  it("shows post stats once loaded", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        posts: [
          { frontmatter: { published: true } },
          { frontmatter: { published: false } },
        ],
      }),
    }) as unknown as typeof fetch;
    render(<AdminDashboard />);
    await waitFor(() =>
      expect(screen.getByText("Total Posts")).toBeInTheDocument(),
    );
    expect(screen.getAllByText("2").length).toBeGreaterThan(0); // 2 total... but published/draft are 1 each
    expect(
      screen.getByRole("link", { name: "Create New Post" }),
    ).toBeInTheDocument();
  });

  it("shows an error state and dashes when the fetch fails", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false });
    jest.spyOn(console, "error").mockImplementation(() => {});
    render(<AdminDashboard />);
    expect(await screen.findByText("Configuration Error")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBe(3);
  });
});

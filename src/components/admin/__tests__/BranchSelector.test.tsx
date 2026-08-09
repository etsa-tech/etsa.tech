/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BranchSelector from "@/components/admin/BranchSelector";
import { AdminProvider } from "@/contexts/AdminContext";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

function renderWithProvider() {
  return render(
    <AdminProvider>
      <BranchSelector />
    </AdminProvider>,
  );
}

describe("BranchSelector", () => {
  it("shows a loading placeholder, then the branch select once loaded", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ branches: ["main", "dev"] }),
    }) as unknown as typeof fetch;
    renderWithProvider();
    expect(await screen.findByLabelText("Branch:")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "dev" })).toBeInTheDocument();
  });

  it("falls back to ['main'] and shows an error indicator when the fetch fails", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false });
    renderWithProvider();
    expect(await screen.findByLabelText("Branch:")).toBeInTheDocument();
    expect(screen.getByTitle("Failed to load branches")).toBeInTheDocument();
  });

  it("shows a distinct badge for a non-main branch, selected via the dropdown", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ branches: ["main", "update-post-x-123"] }),
    }) as unknown as typeof fetch;
    renderWithProvider();
    await screen.findByLabelText("Branch:");
    await userEvent.selectOptions(
      screen.getByLabelText("Branch:"),
      "update-post-x-123",
    );
    expect(screen.getByTitle("update-post-x-123")).toBeInTheDocument();
  });

  it("shows a generic badge style for a non-update-post branch", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ branches: ["main", "feature/x"] }),
    }) as unknown as typeof fetch;
    renderWithProvider();
    await screen.findByLabelText("Branch:");
    await userEvent.selectOptions(
      screen.getByLabelText("Branch:"),
      "feature/x",
    );
    expect(screen.getByTitle("feature/x")).toBeInTheDocument();
  });
});

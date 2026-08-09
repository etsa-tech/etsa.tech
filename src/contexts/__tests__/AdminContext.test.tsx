/**
 * @jest-environment jsdom
 */
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminProvider, useAdmin } from "@/contexts/AdminContext";

function Consumer() {
  const {
    selectedBranch,
    setSelectedBranch,
    availableBranches,
    setAvailableBranches,
  } = useAdmin();
  return (
    <div>
      <span data-testid="branch">{selectedBranch}</span>
      <span data-testid="available">{availableBranches.join(",")}</span>
      <button onClick={() => setSelectedBranch("feature/x")}>select</button>
      <button onClick={() => setAvailableBranches(["main", "feature/x"])}>
        loadBranches
      </button>
      <button onClick={() => setAvailableBranches(["main"])}>
        loadOnlyMain
      </button>
    </div>
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("useAdmin", () => {
  it("throws when used outside an AdminProvider", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Consumer />)).toThrow(
      /must be used within an AdminProvider/,
    );
    spy.mockRestore();
  });
});

describe("AdminProvider", () => {
  it("defaults to the main branch", () => {
    render(
      <AdminProvider>
        <Consumer />
      </AdminProvider>,
    );
    expect(screen.getByTestId("branch")).toHaveTextContent("main");
  });

  it("immediately reverts a restored non-main branch back to main, since availableBranches defaults to ['main'] before any fetch completes", () => {
    // The validate-branch effect distrusts any selectedBranch not already
    // in availableBranches. availableBranches starts as ["main"] (not
    // empty) before BranchSelector's fetch resolves, so a restored branch
    // gets overwritten back to "main" - and re-persisted as such - on the
    // very next render after the restore effect runs.
    window.localStorage.setItem("etsa-admin-branch", "feature/saved");
    render(
      <AdminProvider>
        <Consumer />
      </AdminProvider>,
    );
    expect(screen.getByTestId("branch")).toHaveTextContent("main");
    expect(window.localStorage.getItem("etsa-admin-branch")).toBe("main");
  });

  it("selecting a branch updates state and persists to localStorage", async () => {
    render(
      <AdminProvider>
        <Consumer />
      </AdminProvider>,
    );
    await userEvent.click(screen.getByText("loadBranches"));
    await userEvent.click(screen.getByText("select"));
    expect(screen.getByTestId("branch")).toHaveTextContent("feature/x");
    expect(window.localStorage.getItem("etsa-admin-branch")).toBe("feature/x");
  });

  it("reverts to main when the currently selected branch drops out of a freshly loaded branch list", async () => {
    render(
      <AdminProvider>
        <Consumer />
      </AdminProvider>,
    );
    await userEvent.click(screen.getByText("loadBranches")); // ["main", "feature/x"]
    await userEvent.click(screen.getByText("select")); // selectedBranch = "feature/x"
    expect(screen.getByTestId("branch")).toHaveTextContent("feature/x");

    await userEvent.click(screen.getByText("loadOnlyMain")); // ["main"] no longer has feature/x
    expect(screen.getByTestId("branch")).toHaveTextContent("main");
  });

  it("resets to main and clears storage on a logout storage event", () => {
    render(
      <AdminProvider>
        <Consumer />
      </AdminProvider>,
    );
    window.localStorage.setItem("etsa-admin-branch", "feature/x");
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: "etsa-admin-logout" }),
      );
    });
    expect(screen.getByTestId("branch")).toHaveTextContent("main");
    expect(window.localStorage.getItem("etsa-admin-branch")).toBeNull();
  });

  it("ignores unrelated storage events", () => {
    render(
      <AdminProvider>
        <Consumer />
      </AdminProvider>,
    );
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: "some-other-key" }),
      );
    });
    expect(screen.getByTestId("branch")).toHaveTextContent("main");
  });
});

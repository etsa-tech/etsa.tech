/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AttendancePage from "@/app/admin/attendance/page";

const originalFetch = global.fetch;
const originalConfirm = window.confirm;

const record = {
  id: "a",
  eventDate: "2025-01-01",
  postSlug: "slug",
  eventTitle: "Some Event",
  format: "hybrid",
  inPersonCount: 10,
  virtualCount: 4,
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
  updatedBy: null,
};

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({
    ok,
    json: async () => body,
  } as Response);
}

function mockFetch() {
  return jest.fn((url: string, init?: RequestInit) => {
    if (url === "/api/admin/attendance/posts") {
      return jsonResponse({
        posts: [{ slug: "slug", title: "Some Event", date: "2025-01-01" }],
      });
    }
    if (
      url === "/api/admin/attendance" &&
      (!init || init.method === undefined)
    ) {
      return jsonResponse({ records: [record], canDelete: true });
    }
    if (url === "/api/admin/attendance" && init?.method === "POST") {
      return jsonResponse({ record }, true);
    }
    if (url === "/api/admin/attendance/a" && init?.method === "PUT") {
      return jsonResponse({ record });
    }
    if (url === "/api/admin/attendance/a" && init?.method === "DELETE") {
      return jsonResponse({ success: true });
    }
    return jsonResponse({ records: [] });
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  global.fetch = mockFetch();
});

afterEach(() => {
  global.fetch = originalFetch;
  window.confirm = originalConfirm;
  jest.clearAllMocks();
});

describe("AttendancePage (admin)", () => {
  it("loads and displays records and overall stats", async () => {
    render(<AttendancePage />);
    expect(await screen.findByText("Some Event")).toBeInTheDocument();
    expect(screen.getByText("Events tracked")).toBeInTheDocument();
  });

  it("shows an error when loading records fails", async () => {
    global.fetch = jest.fn((url: string) => {
      if (url === "/api/admin/attendance") {
        return jsonResponse({ error: "boom" }, false);
      }
      return jsonResponse({ posts: [] });
    }) as unknown as typeof fetch;

    render(<AttendancePage />);
    expect(await screen.findByText("boom")).toBeInTheDocument();
  });

  it("opens the add form in a modal and creates a record", async () => {
    render(<AttendancePage />);
    await screen.findByText("Some Event");

    await userEvent.click(screen.getByRole("button", { name: "Add record" }));
    expect(screen.getByText("Add attendance record")).toBeInTheDocument();

    await userEvent.click(
      screen.getByPlaceholderText("Search posts by title..."),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: /Some Event/ }),
    );
    expect(screen.getByLabelText("Event date")).toHaveValue("2025-01-01");

    // Two "Add record" buttons are visible at once: the header button that
    // opened the modal, and the modal form's own submit button (rendered
    // after it in the DOM).
    const addButtons = screen.getAllByRole("button", { name: "Add record" });
    await userEvent.click(addButtons[addButtons.length - 1]);

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/attendance",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    // The modal closes after a successful save.
    expect(screen.queryByText("Add attendance record")).not.toBeInTheDocument();
  });

  it("opens the edit form for a record in a modal and saves changes", async () => {
    render(<AttendancePage />);
    await screen.findByText("Some Event");

    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByText("Edit attendance record")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/attendance/a",
        expect.objectContaining({ method: "PUT" }),
      ),
    );
    expect(
      screen.queryByText("Edit attendance record"),
    ).not.toBeInTheDocument();
  });

  it("closes the modal without saving when its close button is clicked", async () => {
    render(<AttendancePage />);
    await screen.findByText("Some Event");

    await userEvent.click(screen.getByRole("button", { name: "Add record" }));
    expect(screen.getByText("Add attendance record")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByText("Add attendance record")).not.toBeInTheDocument();
  });

  it("deletes a record after confirmation", async () => {
    window.confirm = jest.fn().mockReturnValue(true);
    render(<AttendancePage />);
    await screen.findByText("Some Event");

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/attendance/a",
        expect.objectContaining({ method: "DELETE" }),
      ),
    );
  });

  it("does not delete when confirmation is declined", async () => {
    window.confirm = jest.fn().mockReturnValue(false);
    render(<AttendancePage />);
    await screen.findByText("Some Event");

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(global.fetch).not.toHaveBeenCalledWith(
      "/api/admin/attendance/a",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("hides the Delete action when the server reports canDelete: false (deployed)", async () => {
    global.fetch = jest.fn((url: string, init?: RequestInit) => {
      if (url === "/api/admin/attendance/posts") {
        return jsonResponse({ posts: [] });
      }
      if (url === "/api/admin/attendance" && (!init || !init.method)) {
        return jsonResponse({ records: [record], canDelete: false });
      }
      return jsonResponse({ records: [] });
    }) as unknown as typeof fetch;

    render(<AttendancePage />);
    await screen.findByText("Some Event");

    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Delete" }),
    ).not.toBeInTheDocument();
  });

  it("toggles bulk import mode", async () => {
    render(<AttendancePage />);
    await screen.findByText("Some Event");

    await userEvent.click(screen.getByRole("button", { name: "Bulk import" }));
    expect(
      screen.getByRole("button", { name: "Import rows" }),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(
      screen.queryByRole("button", { name: "Import rows" }),
    ).not.toBeInTheDocument();
  });
});

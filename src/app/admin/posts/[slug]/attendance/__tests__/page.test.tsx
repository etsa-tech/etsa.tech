/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useParams } from "next/navigation";
import PostAttendancePage from "@/app/admin/posts/[slug]/attendance/page";
import { AttendanceRecord } from "@/types/attendance";

jest.mock("next/navigation", () => ({ useParams: jest.fn() }));

const mockedUseParams = jest.mocked(useParams);
const originalFetch = global.fetch;

const record = {
  id: "1",
  eventDate: "2025-01-01",
  postSlug: "a",
  eventTitle: "A Talk",
  format: "hybrid" as const,
  inPersonCount: 10,
  virtualCount: 4,
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
  updatedBy: null,
  notes: "Great turnout",
};

const otherRecord = {
  id: "2",
  eventDate: "2025-03-01",
  postSlug: "b",
  eventTitle: "B Talk",
  format: "hybrid" as const,
  inPersonCount: 5,
  virtualCount: 1,
  createdAt: "2025-03-01T00:00:00.000Z",
  updatedAt: "2025-03-01T00:00:00.000Z",
  updatedBy: null,
};

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: async () => body } as Response);
}

// Mirrors the two GETs PostAttendancePage fires on load: the per-post lookup
// and the full record list (which powers the yearly chart).
function mockFetch({
  lookupRecord = record,
  allRecords = [record, otherRecord],
}: {
  lookupRecord?: AttendanceRecord | null;
  allRecords?: AttendanceRecord[];
} = {}) {
  return jest.fn((url: string, init?: RequestInit) => {
    if (url === "/api/admin/posts/a/attendance") {
      return jsonResponse({
        postSlug: "a",
        postTitle: "A Talk",
        postDate: "2025-01-01",
        record: lookupRecord,
      });
    }
    if (url === "/api/admin/attendance" && (!init || !init.method)) {
      return jsonResponse({ records: allRecords, canDelete: true });
    }
    if (url === "/api/admin/attendance" && init?.method === "POST") {
      return jsonResponse({ record });
    }
    if (url === "/api/admin/attendance/1" && init?.method === "PUT") {
      return jsonResponse({ record });
    }
    return jsonResponse({ records: [] });
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  mockedUseParams.mockReturnValue({ slug: "a" });
});

afterEach(() => {
  global.fetch = originalFetch;
  jest.clearAllMocks();
});

describe("PostAttendancePage", () => {
  it("shows the existing attendance record for the post", async () => {
    global.fetch = mockFetch();

    render(<PostAttendancePage />);
    // "A Talk" appears both in the page header and the chart tooltip.
    expect((await screen.findAllByText("A Talk")).length).toBeGreaterThan(0);
    expect(screen.getByText("Hybrid")).toBeInTheDocument();
    expect(screen.getByText("14")).toBeInTheDocument();
    expect(screen.getByText("Great turnout")).toBeInTheDocument();
  });

  it("shows a yearly breakdown chart highlighting this event", async () => {
    global.fetch = mockFetch();

    render(<PostAttendancePage />);
    await screen.findAllByText("A Talk");

    expect(screen.getByText("2025 attendance by event")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /A Talk.*\(this event\)/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /B Talk/ })).toBeInTheDocument();
  });

  it("omits the chart when the all-records fetch fails", async () => {
    global.fetch = jest.fn((url: string, init?: RequestInit) => {
      if (url === "/api/admin/posts/a/attendance") {
        return jsonResponse({
          postSlug: "a",
          postTitle: "A Talk",
          postDate: "2025-01-01",
          record,
        });
      }
      if (url === "/api/admin/attendance" && (!init || !init.method)) {
        return jsonResponse({ error: "boom" }, false);
      }
      return jsonResponse({ records: [] });
    }) as unknown as typeof fetch;

    render(<PostAttendancePage />);
    await screen.findByText("A Talk");

    expect(
      screen.queryByText("2025 attendance by event"),
    ).not.toBeInTheDocument();
  });

  it("shows an empty state and lets you add a record when none exists", async () => {
    global.fetch = mockFetch({ lookupRecord: null, allRecords: [] });

    render(<PostAttendancePage />);
    expect(
      await screen.findByText("No attendance recorded for this event yet."),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Add attendance record" }),
    );
    // "A Talk" now appears both in the page header and the form's locked-post label
    expect(screen.getAllByText("A Talk").length).toBeGreaterThan(1);
    expect(
      screen.queryByPlaceholderText("Search posts by title..."),
    ).not.toBeInTheDocument();
    // Event date is pre-filled from the post's own date - no manual entry needed.
    expect(screen.getByLabelText("Event date")).toHaveValue("2025-01-01");

    await userEvent.click(screen.getByRole("button", { name: "Add record" }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/attendance",
        expect.objectContaining({ method: "POST" }),
      ),
    );
  });

  it("edits an existing record via PUT to its id", async () => {
    global.fetch = mockFetch();

    render(<PostAttendancePage />);
    await screen.findAllByText("A Talk");

    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/attendance/1",
        expect.objectContaining({ method: "PUT" }),
      ),
    );
  });

  it("shows an error state when the lookup fails", async () => {
    global.fetch = jest.fn((url: string) => {
      if (url === "/api/admin/posts/a/attendance") {
        return jsonResponse({ error: "boom" }, false);
      }
      return jsonResponse({ records: [] });
    }) as unknown as typeof fetch;

    render(<PostAttendancePage />);
    expect(await screen.findByText("boom")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to posts" }),
    ).toBeInTheDocument();
  });
});

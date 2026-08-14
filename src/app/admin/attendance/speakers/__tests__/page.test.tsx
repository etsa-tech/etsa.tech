/**
 * @jest-environment jsdom
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AttendanceBySpeakerPage from "@/app/admin/attendance/speakers/page";

const originalFetch = global.fetch;

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: async () => body } as Response);
}

const janeRecords = [
  {
    id: "r1",
    eventDate: "2025-01-01",
    postSlug: "jan-talk",
    eventTitle: "January Talk",
    format: "hybrid" as const,
    inPersonCount: 12,
    virtualCount: 4,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    updatedBy: null,
  },
];

const multipleSpeakers = [
  {
    speakerName: "Jane Doe",
    eventCount: 3,
    avgTotal: 20,
    avgInPerson: 15,
    avgVirtual: 5,
    records: janeRecords,
  },
  {
    speakerName: "Amy Zhou",
    eventCount: 1,
    avgTotal: 30,
    avgInPerson: 25,
    avgVirtual: 5,
    records: [],
  },
];

afterEach(() => {
  global.fetch = originalFetch;
  jest.clearAllMocks();
});

describe("AttendanceBySpeakerPage", () => {
  it("links the speaker's name to their public speaker profile", async () => {
    global.fetch = jest.fn(() =>
      jsonResponse({ speakers: multipleSpeakers }),
    ) as unknown as typeof fetch;

    render(<AttendanceBySpeakerPage />);
    expect(
      await screen.findByRole("link", { name: "Jane Doe" }),
    ).toHaveAttribute("href", "/speaker/jane-doe");
  });

  it("renders per-speaker stats once loaded", async () => {
    global.fetch = jest.fn(() =>
      jsonResponse({
        speakers: [
          {
            speakerName: "Jane Doe",
            eventCount: 3,
            avgTotal: 20,
            avgInPerson: 15,
            avgVirtual: 5,
          },
        ],
      }),
    ) as unknown as typeof fetch;

    render(<AttendanceBySpeakerPage />);
    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("defaults to sorting by avg. total, highest first", async () => {
    global.fetch = jest.fn(() =>
      jsonResponse({ speakers: multipleSpeakers }),
    ) as unknown as typeof fetch;

    render(<AttendanceBySpeakerPage />);
    const table = await screen.findByRole("table");
    const rows = within(table).getAllByRole("row").slice(1);
    // Amy Zhou has the higher avgTotal (30 vs 20).
    expect(within(rows[0]).getByText("Amy Zhou")).toBeInTheDocument();
  });

  it("sorts by clicking column headers and toggles direction", async () => {
    global.fetch = jest.fn(() =>
      jsonResponse({ speakers: multipleSpeakers }),
    ) as unknown as typeof fetch;

    render(<AttendanceBySpeakerPage />);
    const table = await screen.findByRole("table");

    // New column -> desc by default: "Jane Doe" > "Amy Zhou".
    await userEvent.click(within(table).getByText("Speaker"));
    let rows = within(table).getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("Jane Doe")).toBeInTheDocument();

    await userEvent.click(within(table).getByText("Speaker"));
    rows = within(table).getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("Amy Zhou")).toBeInTheDocument();
  });

  it("filters speakers by search term", async () => {
    global.fetch = jest.fn(() =>
      jsonResponse({ speakers: multipleSpeakers }),
    ) as unknown as typeof fetch;

    render(<AttendanceBySpeakerPage />);
    await screen.findByRole("table");

    await userEvent.type(
      screen.getByPlaceholderText("Search speakers..."),
      "amy",
    );
    expect(screen.queryByText("Jane Doe")).not.toBeInTheDocument();
    expect(screen.getByText("Amy Zhou")).toBeInTheDocument();
  });

  it("shows a no-match message when the search matches nothing", async () => {
    global.fetch = jest.fn(() =>
      jsonResponse({ speakers: multipleSpeakers }),
    ) as unknown as typeof fetch;

    render(<AttendanceBySpeakerPage />);
    await screen.findByRole("table");

    await userEvent.type(
      screen.getByPlaceholderText("Search speakers..."),
      "nonexistent",
    );
    expect(
      screen.getByText("No speakers match your search."),
    ).toBeInTheDocument();
  });

  it("expands a speaker to show their individual talks, and collapses again", async () => {
    global.fetch = jest.fn(() =>
      jsonResponse({ speakers: multipleSpeakers }),
    ) as unknown as typeof fetch;

    render(<AttendanceBySpeakerPage />);
    await screen.findByRole("table");

    expect(screen.queryByText("January Talk")).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Expand Jane Doe's talks" }),
    );

    const talkLink = screen.getByRole("link", { name: "January Talk" });
    expect(talkLink).toHaveAttribute(
      "href",
      "/admin/posts/jan-talk/attendance",
    );
    expect(screen.getByText("2025-01-01")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Collapse Jane Doe's talks" }),
    );
    expect(screen.queryByText("January Talk")).not.toBeInTheDocument();
  });

  it("keeps other speakers collapsed when one is expanded", async () => {
    global.fetch = jest.fn(() =>
      jsonResponse({ speakers: multipleSpeakers }),
    ) as unknown as typeof fetch;

    render(<AttendanceBySpeakerPage />);
    await screen.findByRole("table");

    await userEvent.click(
      screen.getByRole("button", { name: "Expand Amy Zhou's talks" }),
    );
    expect(
      screen.getByRole("button", { name: "Expand Jane Doe's talks" }),
    ).toBeInTheDocument();
  });

  it("shows an empty state when there's no speaker data", async () => {
    global.fetch = jest.fn(() =>
      jsonResponse({ speakers: [] }),
    ) as unknown as typeof fetch;

    render(<AttendanceBySpeakerPage />);
    expect(
      await screen.findByText("No speaker attendance data yet."),
    ).toBeInTheDocument();
  });

  it("shows an error message when the fetch fails", async () => {
    global.fetch = jest.fn(() =>
      jsonResponse({ error: "boom" }, false),
    ) as unknown as typeof fetch;

    render(<AttendanceBySpeakerPage />);
    expect(await screen.findByText("boom")).toBeInTheDocument();
  });

  it("links back to the attendance page", async () => {
    global.fetch = jest.fn(() =>
      jsonResponse({ speakers: [] }),
    ) as unknown as typeof fetch;

    render(<AttendanceBySpeakerPage />);
    expect(
      await screen.findByRole("link", { name: "← Back to attendance" }),
    ).toHaveAttribute("href", "/admin/attendance");
  });
});

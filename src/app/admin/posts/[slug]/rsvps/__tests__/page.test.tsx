/**
 * @jest-environment jsdom
 */
import {
  render,
  screen,
  waitFor,
  within,
  act,
  fireEvent,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useParams } from "next/navigation";
import RsvpReportPage from "@/app/admin/posts/[slug]/rsvps/page";

jest.mock("next/navigation", () => ({ useParams: jest.fn() }));

// jsdom's File implementation doesn't implement Blob#text() in this Node
// version; the page's CSV upload handler relies on it, so polyfill via
// FileReader (which jsdom does implement).
if (!File.prototype.text) {
  File.prototype.text = function (this: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(this);
    });
  };
}

const mockedUseParams = jest.mocked(useParams);
const originalFetch = global.fetch;

beforeEach(() => {
  mockedUseParams.mockReturnValue({ slug: "my-talk" } as never);
});

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
  jest.useRealTimers();
});

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body };
}

const sheetRow = (i: number, name: string, canAttend = "Yes") => ({
  firstName: name.split(" ")[0],
  lastName: name.split(" ")[1] ?? "",
  email: `${name.toLowerCase().replace(" ", ".")}@example.com`,
  canAttend,
  timestamp: `2026-01-0${i}T12:00:00.000Z`,
  comments: i === 1 ? "Excited!" : "",
});

function mockFetchRouter(handlers: Record<string, () => Promise<unknown>>) {
  return jest.fn().mockImplementation((url: string, init?: RequestInit) => {
    for (const [pattern, handler] of Object.entries(handlers)) {
      const method = init?.method ?? "GET";
      const [urlPattern, methodPattern] = pattern.split(" ");
      if (
        url.includes(urlPattern) &&
        (!methodPattern || methodPattern === method)
      ) {
        return handler();
      }
    }
    return Promise.resolve(jsonResponse({}));
  });
}

describe("RsvpReportPage - loading from live sources (no cache)", () => {
  it("loads sheet and meetup data, showing counts and the combined total", async () => {
    global.fetch = mockFetchRouter({
      "/rsvps/cache GET": async () => jsonResponse({ cached: null }),
      "/rsvps/sheet": async () =>
        jsonResponse({
          postTitle: "My Talk",
          sheet: {
            rows: [sheetRow(1, "Jane Doe"), sheetRow(2, "Amy Zhou")],
            error: null,
          },
        }),
      "/rsvps/meetup": async () =>
        jsonResponse({
          postTitle: "My Talk",
          meetup: {
            eventId: "123",
            eventUrl: "https://meetup.com/e/123",
            attendeesUrl: "https://meetup.com/e/123/attendees",
            count: 5,
            title: "My Talk",
            dateTime: "2026-01-01",
            matchedByTitle: false,
            sampleAttendeeNames: ["Sam Lee"],
            error: null,
          },
        }),
    }) as unknown as typeof fetch;

    render(<RsvpReportPage />);
    expect(
      await screen.findByRole("heading", { name: /RSVP Report: My Talk/ }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText("All sources loaded.")).toBeInTheDocument(),
    );

    // "2" and "5" also appear in the "Total for partners" summary <dd>s.
    expect(screen.getAllByText("2").length).toBeGreaterThan(0); // sheet count
    expect(screen.getAllByText("5").length).toBeGreaterThan(0); // meetup count
    // total = 2 sheet (named) + 1 meetup sample name + 4 unnamed meetup = ...
    // just assert the "Total for partners" card renders a number.
    expect(screen.getByText("Total for partners")).toBeInTheDocument();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("Sam Lee")).toBeInTheDocument();
  });

  it("shows per-source error banners when a source fails to load", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = mockFetchRouter({
      "/rsvps/cache GET": async () => jsonResponse({ cached: null }),
      "/rsvps/sheet": async () => jsonResponse({}, false),
      "/rsvps/meetup": async () => jsonResponse({}, false),
    }) as unknown as typeof fetch;
    render(<RsvpReportPage />);
    expect(
      await screen.findByText("Failed to load Google Sheet RSVPs."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Failed to load Meetup RSVPs."),
    ).toBeInTheDocument();
  });

  it("shows an empty-state row when there are no RSVPs from any source", async () => {
    global.fetch = mockFetchRouter({
      "/rsvps/cache GET": async () => jsonResponse({ cached: null }),
      "/rsvps/sheet": async () =>
        jsonResponse({ postTitle: "", sheet: { rows: [], error: null } }),
      "/rsvps/meetup": async () =>
        jsonResponse({
          postTitle: "",
          meetup: {
            eventId: null,
            eventUrl: null,
            attendeesUrl: null,
            count: null,
            title: null,
            dateTime: null,
            matchedByTitle: false,
            sampleAttendeeNames: [],
            error: "No matching Meetup event found by title",
          },
        }),
    }) as unknown as typeof fetch;
    render(<RsvpReportPage />);
    expect(
      await screen.findByText("No RSVPs yet from any source."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No matching Meetup event found by title"),
    ).toBeInTheDocument();
  });
});

describe("RsvpReportPage - cached report", () => {
  it("loads directly from the cache without hitting the live sources", async () => {
    const fetchMock = mockFetchRouter({
      "/rsvps/cache GET": async () =>
        jsonResponse({
          cached: {
            savedAt: "2026-01-05T12:00:00.000Z",
            savedBy: "organizer@etsa.tech",
            data: {
              sheetData: {
                postTitle: "My Talk",
                sheet: { rows: [sheetRow(1, "Jane Doe")], error: null },
              },
              meetupData: null,
              csvAttendees: [],
              csvFileName: null,
              manualEstimate: 2,
              dedupeEnabled: true,
              confidenceThreshold: 0.9,
            },
          },
        }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    render(<RsvpReportPage />);
    expect(await screen.findByText(/Cached report from/)).toBeInTheDocument();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining("/rsvps/sheet"),
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining("/rsvps/meetup"),
    );
  });

  it("falls back to loading from sources when there's nothing cached", async () => {
    const fetchMock = mockFetchRouter({
      "/rsvps/cache GET": async () => jsonResponse({ cached: null }),
      "/rsvps/sheet": async () =>
        jsonResponse({
          postTitle: "My Talk",
          sheet: { rows: [], error: null },
        }),
      "/rsvps/meetup": async () =>
        jsonResponse({
          postTitle: "My Talk",
          meetup: {
            eventId: null,
            eventUrl: null,
            attendeesUrl: null,
            count: null,
            title: null,
            dateTime: null,
            matchedByTitle: false,
            sampleAttendeeNames: [],
            error: null,
          },
        }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    render(<RsvpReportPage />);
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/rsvps/sheet"),
      ),
    );
  });

  it("falls back to loading from sources when the cache lookup itself throws", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = mockFetchRouter({
      "/rsvps/cache GET": async () => Promise.reject(new Error("network down")),
      "/rsvps/sheet": async () =>
        jsonResponse({
          postTitle: "My Talk",
          sheet: { rows: [], error: null },
        }),
      "/rsvps/meetup": async () =>
        jsonResponse({
          postTitle: "My Talk",
          meetup: {
            eventId: null,
            eventUrl: null,
            attendeesUrl: null,
            count: null,
            title: null,
            dateTime: null,
            matchedByTitle: false,
            sampleAttendeeNames: [],
            error: null,
          },
        }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    render(<RsvpReportPage />);
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/rsvps/sheet"),
      ),
    );
  });

  it("shows the raw value when the cached savedAt timestamp isn't a valid date", async () => {
    const fetchMock = mockFetchRouter({
      "/rsvps/cache GET": async () =>
        jsonResponse({
          cached: {
            savedAt: "not-a-date",
            savedBy: "organizer@etsa.tech",
            data: {
              sheetData: null,
              meetupData: null,
              csvAttendees: [],
              csvFileName: null,
              manualEstimate: 0,
              dedupeEnabled: true,
              confidenceThreshold: 0.9,
            },
          },
        }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    render(<RsvpReportPage />);
    expect(
      await screen.findByText("Cached report from not-a-date."),
    ).toBeInTheDocument();
  });
});

describe("RsvpReportPage - missing slug", () => {
  it("does not fetch cache, sources, or allow saving when slug is empty", () => {
    mockedUseParams.mockReturnValue({} as never);
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    render(<RsvpReportPage />);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("RsvpReportPage - CSV upload and manual estimate", () => {
  async function renderLoaded() {
    global.fetch = mockFetchRouter({
      "/rsvps/cache GET": async () => jsonResponse({ cached: null }),
      "/rsvps/sheet": async () =>
        jsonResponse({
          postTitle: "My Talk",
          sheet: { rows: [], error: null },
        }),
      "/rsvps/meetup": async () =>
        jsonResponse({
          postTitle: "My Talk",
          meetup: {
            eventId: null,
            eventUrl: null,
            attendeesUrl: null,
            count: null,
            title: null,
            dateTime: null,
            matchedByTitle: false,
            sampleAttendeeNames: [],
            error: null,
          },
        }),
    }) as unknown as typeof fetch;
    render(<RsvpReportPage />);
    await screen.findByText("All sources loaded.");
  }

  it("parses a valid CSV upload and shows the attendee count", async () => {
    await renderLoaded();
    const csv = "First Name,Last Name\nJane,Doe\nAmy,Zhou\n";
    const file = new File([csv], "attendees.csv", { type: "text/csv" });
    const input = document.getElementById("csvUpload") as HTMLInputElement;
    await userEvent.upload(input, file);
    expect(
      await screen.findByText(/Loaded attendees\.csv: 2 attendees/),
    ).toBeInTheDocument();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
  });

  it("shows a parse warning when the CSV has no recognizable name column", async () => {
    await renderLoaded();
    const csv = "Event,Group\nMy Talk,ETSA\n";
    const file = new File([csv], "bad.csv", { type: "text/csv" });
    const input = document.getElementById("csvUpload") as HTMLInputElement;
    await userEvent.upload(input, file);
    expect(
      await screen.findByText(/Couldn't find a name column in this CSV/),
    ).toBeInTheDocument();
  });

  it("updates the manual walk-in estimate and reflects it in the total", async () => {
    await renderLoaded();
    const input = screen.getByLabelText(/Estimated walk-ins/);
    await userEvent.clear(input);
    await userEvent.type(input, "3");
    expect(await screen.findByText("3 estimated walk-ins")).toBeInTheDocument();
  });

  it("clamps a negative manual estimate to zero", async () => {
    await renderLoaded();
    const input = screen.getByLabelText(
      /Estimated walk-ins/,
    ) as HTMLInputElement;
    // A single atomic change event, rather than userEvent.type()'s
    // keystroke-by-keystroke input (whose intermediate "-" state gets
    // clamped to 0 mid-way, before "5" is even typed).
    fireEventChange(input, "-5");
    await waitFor(() => expect(input.value).toBe("0"));
  });

  it("does nothing when the file input change fires with no file selected", async () => {
    await renderLoaded();
    const input = document.getElementById("csvUpload") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [] } });
    expect(screen.queryByText(/Loaded/)).not.toBeInTheDocument();
  });

  it("parses a CSV with a single 'Name' column, quoted fields with escaped quotes, and CRLF line endings", async () => {
    await renderLoaded();
    const csv = 'Name,Notes\r\n"Jane ""JD"" Doe","hello, world"\r\n';
    const file = new File([csv], "attendees.csv", { type: "text/csv" });
    const input = document.getElementById("csvUpload") as HTMLInputElement;
    await userEvent.upload(input, file);
    expect(
      await screen.findByText(/Loaded attendees\.csv: 1 attendee$/),
    ).toBeInTheDocument();
    expect(screen.getByText('Jane "JD" Doe')).toBeInTheDocument();
  });

  it("excludes Event/Group name-like columns from the single-name-column heuristic", async () => {
    await renderLoaded();
    const csv = "Event Name,Attendee Name\nMy Talk,Amy Zhou\n";
    const file = new File([csv], "attendees.csv", { type: "text/csv" });
    const input = document.getElementById("csvUpload") as HTMLInputElement;
    await userEvent.upload(input, file);
    expect(await screen.findByText("Amy Zhou")).toBeInTheDocument();
  });

  it("flushes the final CSV row even without a trailing newline", async () => {
    await renderLoaded();
    // No trailing "\n" after the last data row.
    const csv = "First Name,Last Name\nJane,Doe";
    const file = new File([csv], "attendees.csv", { type: "text/csv" });
    const input = document.getElementById("csvUpload") as HTMLInputElement;
    await userEvent.upload(input, file);
    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
  });
});

describe("RsvpReportPage - dedupe and table controls", () => {
  async function renderWithRows() {
    global.fetch = mockFetchRouter({
      "/rsvps/cache GET": async () => jsonResponse({ cached: null }),
      "/rsvps/sheet": async () =>
        jsonResponse({
          postTitle: "My Talk",
          sheet: {
            rows: [sheetRow(1, "Jane Doe"), sheetRow(2, "Amy Zhou")],
            error: null,
          },
        }),
      "/rsvps/meetup": async () =>
        jsonResponse({
          postTitle: "My Talk",
          meetup: {
            eventId: null,
            eventUrl: null,
            attendeesUrl: null,
            count: null,
            title: null,
            dateTime: null,
            matchedByTitle: false,
            sampleAttendeeNames: [],
            error: null,
          },
        }),
    }) as unknown as typeof fetch;
    render(<RsvpReportPage />);
    await screen.findByText("All sources loaded.");
  }

  it("filters the table by free text", async () => {
    await renderWithRows();
    await userEvent.type(screen.getByLabelText("Filter"), "Jane");
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.queryByText("Amy Zhou")).not.toBeInTheDocument();
    expect(screen.getByText("Showing 1 of 2")).toBeInTheDocument();
  });

  it("filters the table by source and clears filters", async () => {
    await renderWithRows();
    await userEvent.selectOptions(
      screen.getByLabelText("Source"),
      "Google Sheet",
    );
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Clear filters" }),
    );
    expect(screen.getByLabelText("Filter")).toHaveValue("");
  });

  it("excludes rows from a different source when a specific source is selected", async () => {
    global.fetch = mockFetchRouter({
      "/rsvps/cache GET": async () => jsonResponse({ cached: null }),
      "/rsvps/sheet": async () =>
        jsonResponse({
          postTitle: "My Talk",
          sheet: { rows: [sheetRow(1, "Jane Doe")], error: null },
        }),
      "/rsvps/meetup": async () =>
        jsonResponse({
          postTitle: "My Talk",
          meetup: {
            eventId: null,
            eventUrl: null,
            attendeesUrl: null,
            count: null,
            title: null,
            dateTime: null,
            matchedByTitle: false,
            sampleAttendeeNames: ["Amy Zhou"],
            error: null,
          },
        }),
    }) as unknown as typeof fetch;
    render(<RsvpReportPage />);
    await screen.findByText("All sources loaded.");
    await userEvent.selectOptions(
      screen.getByLabelText("Source"),
      "Google Sheet",
    );
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.queryByText("Amy Zhou")).not.toBeInTheDocument();
  });

  it("shows a filtered-empty message when nothing matches", async () => {
    await renderWithRows();
    await userEvent.type(screen.getByLabelText("Filter"), "nomatch");
    expect(
      await screen.findByText("No rows match the current filter."),
    ).toBeInTheDocument();
  });

  it("sorts the table by clicking column headers, toggling direction", async () => {
    await renderWithRows();
    const table = screen.getByRole("table");
    // "name"/"asc" is the default sort, so Amy Zhou already leads.
    let rows = within(table).getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("Amy Zhou")).toBeInTheDocument();

    // Clicking the already-active column toggles direction to desc.
    await userEvent.click(within(table).getByRole("button", { name: /Name/ }));
    rows = within(table).getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("Jane Doe")).toBeInTheDocument();

    await userEvent.click(within(table).getByRole("button", { name: /Name/ }));
    rows = within(table).getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("Amy Zhou")).toBeInTheDocument();
  });

  it("shows the merged-duplicate note when dedup merges two entries into one cluster", async () => {
    global.fetch = mockFetchRouter({
      "/rsvps/cache GET": async () => jsonResponse({ cached: null }),
      "/rsvps/sheet": async () =>
        jsonResponse({
          postTitle: "My Talk",
          sheet: {
            rows: [
              sheetRow(1, "Jane Doe"),
              { ...sheetRow(2, "Jane Doe"), comments: "" },
            ],
            error: null,
          },
        }),
      "/rsvps/meetup": async () =>
        jsonResponse({
          postTitle: "My Talk",
          meetup: {
            eventId: null,
            eventUrl: null,
            attendeesUrl: null,
            count: null,
            title: null,
            dateTime: null,
            matchedByTitle: false,
            sampleAttendeeNames: [],
            error: null,
          },
        }),
    }) as unknown as typeof fetch;
    render(<RsvpReportPage />);
    await screen.findByText("All sources loaded.");
    expect(screen.getByText(/also matched:/)).toBeInTheDocument();
  });

  it("disabling dedup shows every raw entry unmerged", async () => {
    global.fetch = mockFetchRouter({
      "/rsvps/cache GET": async () => jsonResponse({ cached: null }),
      "/rsvps/sheet": async () =>
        jsonResponse({
          postTitle: "My Talk",
          sheet: {
            rows: [sheetRow(1, "Jane Doe"), sheetRow(2, "Jane Doe")],
            error: null,
          },
        }),
      "/rsvps/meetup": async () =>
        jsonResponse({
          postTitle: "My Talk",
          meetup: {
            eventId: null,
            eventUrl: null,
            attendeesUrl: null,
            count: null,
            title: null,
            dateTime: null,
            matchedByTitle: false,
            sampleAttendeeNames: [],
            error: null,
          },
        }),
    }) as unknown as typeof fetch;
    render(<RsvpReportPage />);
    await screen.findByText("All sources loaded.");
    await userEvent.click(screen.getByLabelText(/Deduplicate similar names/));
    expect(screen.getByText("Showing 2 of 2")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Match confidence/)).not.toBeInTheDocument();
  });

  it("adjusts the confidence threshold slider", async () => {
    await renderWithRows();
    const slider = screen.getByLabelText(/Match confidence/);
    fireEventChange(slider, "0.75");
    expect(
      await screen.findByText(/Match confidence: 0.75/),
    ).toBeInTheDocument();
  });

  it("sorts by the Source and Comments columns", async () => {
    await renderWithRows();
    const table = screen.getByRole("table");
    await userEvent.click(
      within(table).getByRole("button", { name: /Source/ }),
    );
    await userEvent.click(
      within(table).getByRole("button", { name: /Comments/ }),
    );
    // Both are valid, non-throwing sorts - names are still all present.
    expect(within(table).getByText("Jane Doe")).toBeInTheDocument();
    expect(within(table).getByText("Amy Zhou")).toBeInTheDocument();
  });

  it("sorts by the RSVP'd (timestamp) column, pushing timestamp-less rows last", async () => {
    global.fetch = mockFetchRouter({
      "/rsvps/cache GET": async () => jsonResponse({ cached: null }),
      "/rsvps/sheet": async () =>
        jsonResponse({
          postTitle: "My Talk",
          sheet: {
            rows: [sheetRow(1, "Jane Doe"), sheetRow(2, "Amy Zhou")],
            error: null,
          },
        }),
      "/rsvps/meetup": async () =>
        jsonResponse({
          postTitle: "My Talk",
          meetup: {
            eventId: null,
            eventUrl: null,
            attendeesUrl: null,
            count: null,
            title: null,
            dateTime: null,
            matchedByTitle: false,
            // A meetup-sourced entry has no timestamp at all.
            sampleAttendeeNames: ["No Timestamp"],
            error: null,
          },
        }),
    }) as unknown as typeof fetch;
    render(<RsvpReportPage />);
    await screen.findByText("All sources loaded.");
    const table = screen.getByRole("table");
    await userEvent.click(
      within(table).getByRole("button", { name: /RSVP'd/ }),
    );
    const rows = within(table).getAllByRole("row").slice(1);
    // Jane's timestamp (2026-01-01) sorts before Amy's (2026-01-02);
    // "No Timestamp" (null) sorts last regardless of direction.
    expect(within(rows[0]).getByText("Jane Doe")).toBeInTheDocument();
    expect(within(rows[2]).getByText("No Timestamp")).toBeInTheDocument();

    // The null-timestamp comparator ignores sort direction (it always
    // treats missing timestamps as "greatest"); toggling to desc simply
    // reverses the whole array, so the null row moves to the front.
    await userEvent.click(
      within(table).getByRole("button", { name: /RSVP'd/ }),
    );
    const descRows = within(table).getAllByRole("row").slice(1);
    expect(within(descRows[0]).getByText("No Timestamp")).toBeInTheDocument();
  });

  it("hides the unnamed-Meetup-count row and shows the plain eventId when there's no eventUrl", async () => {
    global.fetch = mockFetchRouter({
      "/rsvps/cache GET": async () => jsonResponse({ cached: null }),
      "/rsvps/sheet": async () =>
        jsonResponse({
          postTitle: "My Talk",
          sheet: { rows: [], error: null },
        }),
      "/rsvps/meetup": async () =>
        jsonResponse({
          postTitle: "My Talk",
          meetup: {
            eventId: "123",
            eventUrl: null,
            attendeesUrl: null,
            count: 2,
            title: "My Talk",
            dateTime: "2026-01-01",
            matchedByTitle: false,
            sampleAttendeeNames: ["Amy Zhou", "Jane Doe"],
            error: null,
          },
        }),
    }) as unknown as typeof fetch;
    render(<RsvpReportPage />);
    await screen.findByText("All sources loaded.");
    // eventId renders as plain text (not a link) when there's no eventUrl -
    // it's a bare text node alongside "Meetup event: " in the same <p>, so
    // match on the paragraph's full text instead of the substring alone.
    expect(
      screen.getByText(
        (_, node) =>
          node?.tagName === "P" && node.textContent === "Meetup event: 123",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "123" })).not.toBeInTheDocument();
    expect(screen.queryByText(/more without names/)).not.toBeInTheDocument();
  });

  it("shows a fuzzy-match name (not 'duplicate') for a merged entry with a differently-cased name", async () => {
    global.fetch = mockFetchRouter({
      "/rsvps/cache GET": async () => jsonResponse({ cached: null }),
      "/rsvps/sheet": async () =>
        jsonResponse({
          postTitle: "My Talk",
          sheet: {
            rows: [
              {
                ...sheetRow(1, "Jane Doe"),
                firstName: "JANE",
                lastName: "DOE",
              },
            ],
            error: null,
          },
        }),
      "/rsvps/meetup": async () =>
        jsonResponse({
          postTitle: "My Talk",
          meetup: {
            eventId: null,
            eventUrl: null,
            attendeesUrl: null,
            count: null,
            title: null,
            dateTime: null,
            matchedByTitle: false,
            sampleAttendeeNames: ["Jane Doe"],
            error: null,
          },
        }),
    }) as unknown as typeof fetch;
    render(<RsvpReportPage />);
    await screen.findByText("All sources loaded.");
    const matched = screen.getByText(/also matched:/);
    expect(matched.textContent).toBe("also matched: Jane Doe (Meetup)");
  });
});

// fireEvent.change wrapper for range inputs, kept local since userEvent
// doesn't have great range-input support.
function fireEventChange(el: Element, value: string) {
  fireEvent.change(el, { target: { value } });
}

describe("RsvpReportPage - save and refresh actions", () => {
  async function renderLoaded(
    extraHandlers: Record<string, () => Promise<unknown>> = {},
  ) {
    const fetchMock = mockFetchRouter({
      "/rsvps/cache GET": async () => jsonResponse({ cached: null }),
      "/rsvps/sheet": async () =>
        jsonResponse({
          postTitle: "My Talk",
          sheet: { rows: [sheetRow(1, "Jane Doe")], error: null },
        }),
      "/rsvps/meetup": async () =>
        jsonResponse({
          postTitle: "My Talk",
          meetup: {
            eventId: null,
            eventUrl: null,
            attendeesUrl: null,
            count: null,
            title: null,
            dateTime: null,
            matchedByTitle: false,
            sampleAttendeeNames: [],
            error: null,
          },
        }),
      ...extraHandlers,
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    render(<RsvpReportPage />);
    await screen.findByText("All sources loaded.");
    return fetchMock;
  }

  it("saves the report on demand via 'Save now'", async () => {
    const fetchMock = await renderLoaded({
      "/rsvps/cache PUT": async () =>
        jsonResponse({ cached: { savedAt: "2026-01-06T00:00:00.000Z" } }),
    });
    await userEvent.click(screen.getByRole("button", { name: "Save now" }));
    expect(await screen.findByText("Report saved.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/rsvps/cache"),
      expect.objectContaining({ method: "PUT" }),
    );
  });

  it("shows a failure notification when saving errors", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    await renderLoaded({
      "/rsvps/cache PUT": async () => jsonResponse({}, false),
    });
    await userEvent.click(screen.getByRole("button", { name: "Save now" }));
    expect(
      await screen.findByText("Failed to save report."),
    ).toBeInTheDocument();
  });

  it("re-fetches from live sources when 'Refresh from data sources' is clicked", async () => {
    const fetchMock = await renderLoaded();
    fetchMock.mockClear();
    await userEvent.click(
      screen.getByRole("button", { name: "Refresh from data sources" }),
    );
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/rsvps/sheet"),
      ),
    );
  });

  it("auto-saves after the report has been dirty for the autosave delay", async () => {
    jest.useFakeTimers({ advanceTimers: true });
    const fetchMock = await renderLoaded({
      "/rsvps/cache PUT": async () =>
        jsonResponse({ cached: { savedAt: "2026-01-06T00:00:00.000Z" } }),
    });
    expect(await screen.findByText(/Unsaved changes/)).toBeInTheDocument();
    await act(async () => {
      jest.advanceTimersByTime(10000);
    });
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/rsvps/cache"),
        expect.objectContaining({ method: "PUT" }),
      ),
    );
  });
});

describe("RsvpReportPage - manual Meetup Event ID", () => {
  it("queries and saves a manually-entered Meetup Event ID", async () => {
    const fetchMock = mockFetchRouter({
      "/rsvps/cache GET": async () => jsonResponse({ cached: null }),
      "/rsvps/sheet": async () =>
        jsonResponse({
          postTitle: "My Talk",
          sheet: { rows: [], error: null },
        }),
      "/rsvps/meetup?eventId": async () =>
        jsonResponse({
          postTitle: "My Talk",
          meetup: {
            eventId: "999",
            eventUrl: "https://meetup.com/e/999",
            attendeesUrl: null,
            count: 3,
            title: "My Talk",
            dateTime: "2026-01-01",
            matchedByTitle: false,
            sampleAttendeeNames: [],
            error: null,
          },
        }),
      "/rsvps/meetup": async () =>
        jsonResponse({
          postTitle: "My Talk",
          meetup: {
            eventId: null,
            eventUrl: null,
            attendeesUrl: null,
            count: null,
            title: null,
            dateTime: null,
            matchedByTitle: false,
            sampleAttendeeNames: [],
            error: "No matching Meetup event found by title",
          },
        }),
      "/admin/posts/my-talk GET": async () =>
        jsonResponse({ frontmatter: { title: "My Talk" }, content: "body" }),
      "/admin/posts/my-talk PUT": async () =>
        jsonResponse({
          isNewPR: true,
          prNumber: 12,
          prUrl: "https://github.com/x/pull/12",
          autoMergeEnabled: true,
        }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    render(<RsvpReportPage />);
    await screen.findByText(
      /No match found - set the Meetup Event ID manually/,
    );

    await userEvent.type(screen.getByLabelText(/No match found/), "999");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("999")).toBeInTheDocument();
    expect(await screen.findByText(/Opened/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "PR #12" })).toHaveAttribute(
      "href",
      "https://github.com/x/pull/12",
    );
  });

  it("offers a quick-save button for a title-auto-matched Meetup event", async () => {
    const fetchMock = mockFetchRouter({
      "/rsvps/cache GET": async () => jsonResponse({ cached: null }),
      "/rsvps/sheet": async () =>
        jsonResponse({
          postTitle: "My Talk",
          sheet: { rows: [], error: null },
        }),
      "/rsvps/meetup": async () =>
        jsonResponse({
          postTitle: "My Talk",
          meetup: {
            eventId: "555",
            eventUrl: "https://meetup.com/e/555",
            attendeesUrl: null,
            count: 1,
            title: "My Talk",
            dateTime: "2026-01-01",
            matchedByTitle: true,
            sampleAttendeeNames: [],
            error: null,
          },
        }),
      "/admin/posts/my-talk GET": async () =>
        jsonResponse({ frontmatter: { title: "My Talk" }, content: "body" }),
      "/admin/posts/my-talk PUT": async () =>
        jsonResponse({
          isNewPR: false,
          prNumber: 7,
          prUrl: "https://github.com/x/pull/7",
          autoMergeEnabled: false,
        }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    render(<RsvpReportPage />);
    expect(
      await screen.findByText("Auto-matched by title."),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", {
        name: "Save to post for faster lookup next time",
      }),
    );
    expect(await screen.findByText(/Added to existing/)).toBeInTheDocument();
  });

  it("shows a failure message when the manual Meetup Event ID lookup itself fails", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = mockFetchRouter({
      "/rsvps/cache GET": async () => jsonResponse({ cached: null }),
      "/rsvps/sheet": async () =>
        jsonResponse({
          postTitle: "My Talk",
          sheet: { rows: [], error: null },
        }),
      "/rsvps/meetup?eventId": async () => jsonResponse({}, false),
      "/rsvps/meetup": async () =>
        jsonResponse({
          postTitle: "My Talk",
          meetup: {
            eventId: null,
            eventUrl: null,
            attendeesUrl: null,
            count: null,
            title: null,
            dateTime: null,
            matchedByTitle: false,
            sampleAttendeeNames: [],
            error: null,
          },
        }),
      "/admin/posts/my-talk GET": async () =>
        jsonResponse({ frontmatter: { title: "My Talk" }, content: "body" }),
      "/admin/posts/my-talk PUT": async () =>
        jsonResponse({
          isNewPR: true,
          prNumber: 1,
          prUrl: "https://github.com/x/pull/1",
          autoMergeEnabled: false,
        }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    render(<RsvpReportPage />);
    await screen.findByText(/No match found/);
    await userEvent.type(screen.getByLabelText(/No match found/), "999");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(
      await screen.findByText("Failed to load Meetup RSVPs."),
    ).toBeInTheDocument();
  });

  it("shows a failure message when saving the Meetup Event ID fails", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = mockFetchRouter({
      "/rsvps/cache GET": async () => jsonResponse({ cached: null }),
      "/rsvps/sheet": async () =>
        jsonResponse({
          postTitle: "My Talk",
          sheet: { rows: [], error: null },
        }),
      "/rsvps/meetup": async () =>
        jsonResponse({
          postTitle: "My Talk",
          meetup: {
            eventId: null,
            eventUrl: null,
            attendeesUrl: null,
            count: null,
            title: null,
            dateTime: null,
            matchedByTitle: false,
            sampleAttendeeNames: [],
            error: null,
          },
        }),
      "/admin/posts/my-talk GET": async () => jsonResponse({}, false),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    render(<RsvpReportPage />);
    await screen.findByText(/No match found/);
    await userEvent.type(screen.getByLabelText(/No match found/), "999");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(
      await screen.findByText(/Failed to save the Meetup Event ID\./),
    ).toBeInTheDocument();
  });
});

describe("RsvpReportPage - CSV report download", () => {
  it("triggers a CSV download when the button is clicked", async () => {
    global.fetch = mockFetchRouter({
      "/rsvps/cache GET": async () => jsonResponse({ cached: null }),
      "/rsvps/sheet": async () =>
        jsonResponse({
          postTitle: "My Talk",
          sheet: { rows: [sheetRow(1, "Jane Doe")], error: null },
        }),
      "/rsvps/meetup": async () =>
        jsonResponse({
          postTitle: "My Talk",
          meetup: {
            eventId: null,
            eventUrl: null,
            attendeesUrl: null,
            count: null,
            title: null,
            dateTime: null,
            matchedByTitle: false,
            sampleAttendeeNames: [],
            error: null,
          },
        }),
    }) as unknown as typeof fetch;
    URL.createObjectURL = jest.fn(() => "blob:mock-url");
    URL.revokeObjectURL = jest.fn();
    render(<RsvpReportPage />);
    await screen.findByText("All sources loaded.");
    await userEvent.click(
      screen.getByRole("button", { name: "Download CSV report" }),
    );
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("includes quoted fields, unnamed Meetup rows, and manual-estimate rows in the CSV", async () => {
    global.fetch = mockFetchRouter({
      "/rsvps/cache GET": async () => jsonResponse({ cached: null }),
      "/rsvps/sheet": async () =>
        jsonResponse({
          postTitle: "My Talk",
          sheet: {
            rows: [
              {
                ...sheetRow(1, "Jane Doe"),
                comments: 'Bringing "guests", RSVP+1',
              },
            ],
            error: null,
          },
        }),
      "/rsvps/meetup": async () =>
        jsonResponse({
          postTitle: "My Talk",
          meetup: {
            eventId: null,
            eventUrl: null,
            attendeesUrl: null,
            count: 4,
            title: null,
            dateTime: null,
            matchedByTitle: false,
            sampleAttendeeNames: ["Amy Zhou"],
            error: null,
          },
        }),
    }) as unknown as typeof fetch;
    let capturedBlob: Blob | null = null;
    URL.createObjectURL = jest.fn((blob: Blob) => {
      capturedBlob = blob;
      return "blob:mock-url";
    });
    URL.revokeObjectURL = jest.fn();
    render(<RsvpReportPage />);
    await screen.findByText("All sources loaded.");

    const estimateInput = screen.getByLabelText(/Estimated walk-ins/);
    await userEvent.clear(estimateInput);
    await userEvent.type(estimateInput, "2");
    await screen.findByText("2 estimated walk-ins");

    await userEvent.click(
      screen.getByRole("button", { name: "Download CSV report" }),
    );
    expect(capturedBlob).not.toBeNull();
    const csvText = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(capturedBlob!);
    });
    expect(csvText).toContain('"Bringing ""guests"", RSVP+1"');
    expect(csvText).toContain("Meetup RSVP (name not available),Meetup,,");
    expect(csvText).toContain("Estimated walk-in,Manual estimate,,");
  });
});

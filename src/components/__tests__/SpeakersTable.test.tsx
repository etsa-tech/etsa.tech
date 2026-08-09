/**
 * @jest-environment jsdom
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpeakersTable } from "@/components/SpeakersTable";
import type { PostSummary, Speaker } from "@/types/post";

function talk(slug: string, title: string, date: string): PostSummary {
  return {
    slug,
    readingTime: 1,
    frontmatter: { title, date, excerpt: "x", tags: [] } as never,
  };
}

function speakerData(
  name: string,
  overrides: Partial<{
    speaker: Speaker;
    talkCount: number;
    latestTalk: PostSummary | null;
  }> = {},
) {
  return {
    name,
    speaker: {
      name,
      title: undefined,
      bio: undefined,
      image: undefined,
      ...overrides.speaker,
    },
    talkCount: overrides.talkCount ?? 1,
    latestTalk:
      overrides.latestTalk === undefined ? null : overrides.latestTalk,
    allTalks: [],
  };
}

const speakers = [
  speakerData("Amy Zhou", {
    speaker: { name: "Amy Zhou", title: "Engineer" } as Speaker,
    talkCount: 2,
    latestTalk: talk("amy-1", "Amy's Talk", "2026-02-01"),
  }),
  speakerData("Ben Taylor", {
    speaker: {
      name: "Ben Taylor",
      title: "DevOps Lead",
      image: "/ben.jpg",
    } as Speaker,
    talkCount: 5,
    latestTalk: talk("ben-1", "Ben's Talk", "2026-01-01"),
  }),
];

describe("SpeakersTable", () => {
  it("defaults to grid view showing all speakers sorted by talk count desc", () => {
    render(<SpeakersTable speakers={speakers} />);
    expect(screen.getByText("Showing 2 of 2 speakers")).toBeInTheDocument();
    const names = screen
      .getAllByText(/Amy Zhou|Ben Taylor/)
      .map((n) => n.textContent);
    expect(names[0]).toBe("Ben Taylor"); // higher talkCount first (desc default)
  });

  it("filters speakers by search term", async () => {
    render(<SpeakersTable speakers={speakers} />);
    await userEvent.type(screen.getByPlaceholderText(/Search speakers/), "Amy");
    expect(screen.getByText("Showing 1 of 2 speakers")).toBeInTheDocument();
  });

  it("shows an empty state when nothing matches the search", async () => {
    render(<SpeakersTable speakers={speakers} />);
    await userEvent.type(
      screen.getByPlaceholderText(/Search speakers/),
      "nonexistent",
    );
    expect(screen.getByText("No speakers found")).toBeInTheDocument();
  });

  it("switches to table view and renders sortable column headers", async () => {
    render(<SpeakersTable speakers={speakers} />);
    await userEvent.click(screen.getByTitle("Table view"));
    expect(
      screen.getByRole("columnheader", { name: /Speaker/ }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("View").length).toBeGreaterThan(0);
  });

  it("switching to a new sort column starts in descending order", async () => {
    render(<SpeakersTable speakers={speakers} />);
    await userEvent.click(screen.getByTitle("Table view"));
    const table = screen.getByRole("table");
    await userEvent.click(within(table).getByText("Speaker"));
    const rows = within(table).getAllByRole("row").slice(1); // skip header row
    // New column -> desc by default: "Ben Taylor" > "Amy Zhou" alphabetically.
    expect(within(rows[0]).getByText("Ben Taylor")).toBeInTheDocument();
  });

  it("toggles sort direction when the same column is clicked twice", async () => {
    render(<SpeakersTable speakers={speakers} />);
    await userEvent.click(screen.getByTitle("Table view"));
    const table = screen.getByRole("table");
    await userEvent.click(within(table).getByText("Speaker")); // desc by name: Ben, Amy
    await userEvent.click(within(table).getByText("Speaker")); // asc by name: Amy, Ben
    const rows = within(table).getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("Amy Zhou")).toBeInTheDocument();
  });

  it("renders initials avatar fallback when no speaker image is set", async () => {
    render(<SpeakersTable speakers={speakers} />);
    await userEvent.click(screen.getByTitle("Table view"));
    // Desktop table and mobile list both render in jsdom (CSS visibility
    // only, not conditional rendering), so the fallback shows up twice.
    expect(screen.getAllByText("AZ").length).toBeGreaterThan(0);
  });

  it("shows an em dash for speakers with no latest talk in table view", async () => {
    const noTalk = [speakerData("No Talks Yet")];
    render(<SpeakersTable speakers={noTalk} />);
    await userEvent.click(screen.getByTitle("Table view"));
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("changes sort field via the mobile select control", async () => {
    render(<SpeakersTable speakers={speakers} />);
    await userEvent.click(screen.getByTitle("Table view"));
    const selects = screen.getAllByRole("combobox", { hidden: true });
    await userEvent.selectOptions(selects[0], "name");
    expect((selects[0] as HTMLSelectElement).value).toBe("name");
  });

  it("toggles sort direction via the mobile sort-direction button", async () => {
    render(<SpeakersTable speakers={speakers} />);
    await userEvent.click(screen.getByTitle("Table view"));
    // sortDirection defaults to "desc", so the button's title reflects the
    // action it will perform: "Sort ascending".
    const toggle = screen.getByTitle("Sort ascending");
    await userEvent.click(toggle);
    expect(screen.getByTitle("Sort descending")).toBeInTheDocument();
  });

  it("switches back to grid view from table view", async () => {
    render(<SpeakersTable speakers={speakers} />);
    await userEvent.click(screen.getByTitle("Table view"));
    await userEvent.click(screen.getByTitle("Grid view"));
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getAllByText("View Profile").length).toBeGreaterThan(0);
  });

  it("sorts by talk count and by latest talk date via their column headers", async () => {
    render(<SpeakersTable speakers={speakers} />);
    await userEvent.click(screen.getByTitle("Table view"));
    const table = screen.getByRole("table");

    // Default sort field is already "talkCount" (desc), so switch away to
    // "name" first, then back to "Talks" to exercise the new-field ->
    // desc-by-default branch of handleSort.
    await userEvent.click(within(table).getByText("Speaker"));
    await userEvent.click(within(table).getByText("Talks"));
    let rows = within(table).getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("Ben Taylor")).toBeInTheDocument(); // 5 talks, desc

    await userEvent.click(within(table).getByText("Latest Talk"));
    rows = within(table).getAllByRole("row").slice(1);
    // Amy's latest talk (2026-02-01) is more recent than Ben's (2026-01-01).
    expect(within(rows[0]).getByText("Amy's Talk")).toBeInTheDocument();
  });

  it("falls back to a fixed date when sorting by latest talk with no talk at all", async () => {
    const mixed = [
      speakerData("Has Talk", {
        latestTalk: talk("a", "A Talk", "2026-01-01"),
      }),
      speakerData("No Talk"),
    ];
    render(<SpeakersTable speakers={mixed} />);
    await userEvent.click(screen.getByTitle("Table view"));
    const table = screen.getByRole("table");
    await userEvent.click(within(table).getByText("Latest Talk"));
    const rows = within(table).getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("Has Talk")).toBeInTheDocument();
  });
});

/**
 * @jest-environment jsdom
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AttendanceTable from "@/components/admin/AttendanceTable";
import { AttendanceRecord } from "@/types/attendance";

const record: AttendanceRecord = {
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

const otherRecord: AttendanceRecord = {
  id: "b",
  eventDate: "2025-02-01",
  postSlug: "other-slug",
  eventTitle: "Other Event",
  format: "virtual",
  inPersonCount: 0,
  virtualCount: 9,
  createdAt: "2025-02-01T00:00:00.000Z",
  updatedAt: "2025-02-01T00:00:00.000Z",
  updatedBy: null,
  notes: "Guest speaker",
};

describe("AttendanceTable", () => {
  it("shows a loading message while loading", () => {
    render(
      <AttendanceTable
        records={[]}
        isLoading={true}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        canDelete={false}
      />,
    );
    expect(
      screen.getByText("Loading attendance records..."),
    ).toBeInTheDocument();
  });

  it("shows an empty state when there are no records", () => {
    render(
      <AttendanceTable
        records={[]}
        isLoading={false}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        canDelete={false}
      />,
    );
    expect(screen.getByText("No attendance records yet.")).toBeInTheDocument();
  });

  it("renders a row per record with the computed total", () => {
    render(
      <AttendanceTable
        records={[record]}
        isLoading={false}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        canDelete={true}
      />,
    );
    expect(screen.getByText("Some Event")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Hybrid" })).toBeInTheDocument();
    expect(screen.getByText("14")).toBeInTheDocument();
  });

  it("calls onEdit and onDelete when deleting is allowed", async () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    render(
      <AttendanceTable
        records={[record]}
        isLoading={false}
        onEdit={onEdit}
        onDelete={onDelete}
        canDelete={true}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(onEdit).toHaveBeenCalledWith(record);

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledWith(record);
  });

  it("hides the Delete action when canDelete is false", () => {
    render(
      <AttendanceTable
        records={[record]}
        isLoading={false}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        canDelete={false}
      />,
    );
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Delete" }),
    ).not.toBeInTheDocument();
  });

  it("links the event title to that post's attendance page", () => {
    render(
      <AttendanceTable
        records={[record]}
        isLoading={false}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        canDelete={false}
      />,
    );
    expect(screen.getByRole("link", { name: "Some Event" })).toHaveAttribute(
      "href",
      "/admin/posts/slug/attendance",
    );
  });

  it("filters records by search term across title, slug, and notes", async () => {
    render(
      <AttendanceTable
        records={[record, otherRecord]}
        isLoading={false}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        canDelete={false}
      />,
    );

    await userEvent.type(
      screen.getByPlaceholderText("Search event, slug, or notes..."),
      "guest",
    );
    expect(screen.queryByText("Some Event")).not.toBeInTheDocument();
    expect(screen.getByText("Other Event")).toBeInTheDocument();
  });

  it("filters records by format", async () => {
    render(
      <AttendanceTable
        records={[record, otherRecord]}
        isLoading={false}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        canDelete={false}
      />,
    );

    await userEvent.selectOptions(
      screen.getByLabelText("Filter by format"),
      "virtual",
    );
    expect(screen.queryByText("Some Event")).not.toBeInTheDocument();
    expect(screen.getByText("Other Event")).toBeInTheDocument();
  });

  it("shows a no-match message when the search matches nothing", async () => {
    render(
      <AttendanceTable
        records={[record]}
        isLoading={false}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        canDelete={false}
      />,
    );

    await userEvent.type(
      screen.getByPlaceholderText("Search event, slug, or notes..."),
      "nonexistent",
    );
    expect(
      screen.getByText("No records match your search."),
    ).toBeInTheDocument();
  });

  it("defaults to sorting by date, newest first", () => {
    render(
      <AttendanceTable
        records={[record, otherRecord]}
        isLoading={false}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        canDelete={false}
      />,
    );
    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("Other Event")).toBeInTheDocument();
  });

  it("sorts by clicking column headers and toggles direction", async () => {
    render(
      <AttendanceTable
        records={[record, otherRecord]}
        isLoading={false}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        canDelete={false}
      />,
    );
    const table = screen.getByRole("table");

    // New column -> desc by default: "Some Event" > "Other Event".
    await userEvent.click(within(table).getByText("Event"));
    let rows = within(table).getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("Some Event")).toBeInTheDocument();

    // Same column again -> toggles to asc.
    await userEvent.click(within(table).getByText("Event"));
    rows = within(table).getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("Other Event")).toBeInTheDocument();
  });

  it("sorts numerically by the In-person column", async () => {
    render(
      <AttendanceTable
        records={[record, otherRecord]}
        isLoading={false}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        canDelete={false}
      />,
    );
    const table = screen.getByRole("table");

    // New column -> desc by default: 10 (Some Event) > 0 (Other Event).
    await userEvent.click(within(table).getByText("In-person"));
    const rows = within(table).getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("Some Event")).toBeInTheDocument();
  });
});

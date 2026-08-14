/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { YearAttendanceBreakdown } from "@/components/YearAttendanceBreakdown";
import { AttendanceRecord } from "@/types/attendance";

const records: AttendanceRecord[] = [
  {
    id: "a",
    eventDate: "2025-03-05",
    postSlug: "march-talk",
    eventTitle: "March Talk",
    format: "hybrid",
    inPersonCount: 10,
    virtualCount: 4,
    createdAt: "2025-03-05T00:00:00.000Z",
    updatedAt: "2025-03-05T00:00:00.000Z",
    updatedBy: null,
  },
  {
    id: "b",
    eventDate: "2025-01-05",
    postSlug: "january-social",
    eventTitle: "January Social",
    format: "in-person",
    inPersonCount: 8,
    virtualCount: 0,
    createdAt: "2025-01-05T00:00:00.000Z",
    updatedAt: "2025-01-05T00:00:00.000Z",
    updatedBy: null,
  },
  {
    id: "c",
    eventDate: "2024-05-05",
    postSlug: "other-year-talk",
    eventTitle: "Other Year Talk",
    format: "hybrid",
    inPersonCount: 5,
    virtualCount: 5,
    createdAt: "2024-05-05T00:00:00.000Z",
    updatedAt: "2024-05-05T00:00:00.000Z",
    updatedBy: null,
  },
];

describe("YearAttendanceBreakdown", () => {
  it("shows a message when the year has no records", () => {
    render(<YearAttendanceBreakdown year={2099} records={records} />);
    expect(
      screen.getByText("No events recorded for 2099."),
    ).toBeInTheDocument();
  });

  it("only renders bars for events within the given year, sorted chronologically", () => {
    render(<YearAttendanceBreakdown year={2025} records={records} />);

    const bars = screen.getAllByRole("button");
    expect(bars).toHaveLength(2);
    // January before March.
    expect(bars[0]).toHaveAccessibleName(/January Social/);
    expect(bars[1]).toHaveAccessibleName(/March Talk/);
    expect(screen.queryByText(/Other Year Talk/)).not.toBeInTheDocument();
  });

  it("includes counts in the accessible name for each bar", () => {
    render(<YearAttendanceBreakdown year={2025} records={records} />);
    expect(
      screen.getByRole("button", {
        name: "March Talk, 2025-03-05: 10 in-person, 4 virtual, 14 total",
      }),
    ).toBeInTheDocument();
  });

  it("renders the legend for both series", () => {
    render(<YearAttendanceBreakdown year={2025} records={records} />);
    expect(screen.getByText("In-person")).toBeInTheDocument();
    expect(screen.getByText("Virtual")).toBeInTheDocument();
  });

  it("marks the highlighted bar's accessible name and adds a highlight ring", () => {
    render(
      <YearAttendanceBreakdown year={2025} records={records} highlightId="b" />,
    );
    const highlighted = screen.getByRole("button", {
      name: /January Social.*\(this event\)/,
    });
    expect(highlighted).toBeInTheDocument();

    const notHighlighted = screen.getByRole("button", { name: /March Talk/ });
    expect(notHighlighted).not.toHaveAccessibleName(/\(this event\)/);
  });

  it("does not mark any bar when highlightId doesn't match a record in this year", () => {
    render(
      <YearAttendanceBreakdown year={2025} records={records} highlightId="c" />,
    );
    expect(
      screen.queryByRole("button", { name: /\(this event\)/ }),
    ).not.toBeInTheDocument();
  });
});

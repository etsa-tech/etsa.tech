/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AttendanceStats } from "@/components/AttendanceStats";
import { AttendanceRecord } from "@/types/attendance";

const yearlyStats = {
  overall: {
    totalEvents: 2,
    avgTotal: 10,
    avgInPerson: 7,
    avgVirtual: 3,
    firstEventDate: "2024-01-01",
    lastEventDate: "2025-01-01",
  },
  yearly: [
    { year: 2025, eventCount: 1, avgTotal: 10, avgInPerson: 7, avgVirtual: 3 },
    { year: 2024, eventCount: 1, avgTotal: 8, avgInPerson: 5, avgVirtual: 3 },
  ],
};

const records: AttendanceRecord[] = [
  {
    id: "a",
    eventDate: "2025-01-05",
    postSlug: "jan-talk",
    eventTitle: "January Talk",
    format: "hybrid",
    inPersonCount: 7,
    virtualCount: 3,
    createdAt: "2025-01-05T00:00:00.000Z",
    updatedAt: "2025-01-05T00:00:00.000Z",
    updatedBy: null,
  },
  {
    id: "b",
    eventDate: "2024-06-05",
    postSlug: "june-talk",
    eventTitle: "June Talk",
    format: "hybrid",
    inPersonCount: 5,
    virtualCount: 3,
    createdAt: "2024-06-05T00:00:00.000Z",
    updatedAt: "2024-06-05T00:00:00.000Z",
    updatedBy: null,
  },
];

describe("AttendanceStats", () => {
  it("renders overall stat cards", () => {
    render(
      <AttendanceStats
        stats={{
          overall: {
            totalEvents: 5,
            avgTotal: 20,
            avgInPerson: 15,
            avgVirtual: 5,
            firstEventDate: "2024-01-01",
            lastEventDate: "2025-01-01",
          },
          yearly: [],
        }}
      />,
    );
    expect(screen.getAllByText("5")).toHaveLength(2); // totalEvents and avgVirtual both render "5"
    expect(screen.getByText("Events tracked")).toBeInTheDocument();
    expect(screen.getByText("Avg. in-person")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
  });

  it("renders a bar per year when yearly stats are present", () => {
    render(
      <AttendanceStats
        stats={{
          overall: {
            totalEvents: 2,
            avgTotal: 10,
            avgInPerson: 7,
            avgVirtual: 3,
            firstEventDate: "2024-01-01",
            lastEventDate: "2025-01-01",
          },
          yearly: [
            {
              year: 2025,
              eventCount: 1,
              avgTotal: 10,
              avgInPerson: 7,
              avgVirtual: 3,
            },
            {
              year: 2024,
              eventCount: 1,
              avgTotal: 8,
              avgInPerson: 5,
              avgVirtual: 3,
            },
          ],
        }}
      />,
    );
    expect(screen.getByText("2025")).toBeInTheDocument();
    expect(screen.getByText("2024")).toBeInTheDocument();
    expect(screen.getByText("Yearly attendance trend")).toBeInTheDocument();
  });

  it("does not make year rows clickable when no records are provided (public page)", () => {
    render(<AttendanceStats stats={yearlyStats} />);
    expect(
      screen.queryByRole("button", { name: /2025/ }),
    ).not.toBeInTheDocument();
  });

  it("expands a per-event breakdown when a year is clicked (admin page)", async () => {
    render(<AttendanceStats stats={yearlyStats} records={records} />);

    const yearButton = screen.getByRole("button", { name: /2025/ });
    expect(yearButton).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(yearButton);
    expect(yearButton).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("button", { name: /January Talk/ }),
    ).toBeInTheDocument();
    // The other year's event should not appear in the 2025 breakdown.
    expect(
      screen.queryByRole("button", { name: /June Talk/ }),
    ).not.toBeInTheDocument();
  });

  it("collapses the breakdown when the same year is clicked again", async () => {
    render(<AttendanceStats stats={yearlyStats} records={records} />);
    const yearButton = screen.getByRole("button", { name: /2025/ });

    await userEvent.click(yearButton);
    expect(
      screen.getByRole("button", { name: /January Talk/ }),
    ).toBeInTheDocument();

    await userEvent.click(yearButton);
    expect(
      screen.queryByRole("button", { name: /January Talk/ }),
    ).not.toBeInTheDocument();
  });

  it("switches the breakdown when a different year is clicked", async () => {
    render(<AttendanceStats stats={yearlyStats} records={records} />);

    await userEvent.click(screen.getByRole("button", { name: /2025/ }));
    expect(
      screen.getByRole("button", { name: /January Talk/ }),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /2024/ }));
    expect(
      screen.queryByRole("button", { name: /January Talk/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /June Talk/ }),
    ).toBeInTheDocument();
  });

  it("omits the yearly trend card when there are no yearly stats", () => {
    render(
      <AttendanceStats
        stats={{
          overall: {
            totalEvents: 0,
            avgTotal: 0,
            avgInPerson: 0,
            avgVirtual: 0,
            firstEventDate: null,
            lastEventDate: null,
          },
          yearly: [],
        }}
      />,
    );
    expect(
      screen.queryByText("Yearly attendance trend"),
    ).not.toBeInTheDocument();
  });
});

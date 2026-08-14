/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { listAttendanceRecords } from "@/lib/attendance-store";
import AttendancePage from "@/app/attendance/page";

jest.mock("@/lib/attendance-store", () => ({
  listAttendanceRecords: jest.fn(),
}));

const mockedListAttendanceRecords = jest.mocked(listAttendanceRecords);

afterEach(() => jest.clearAllMocks());

describe("AttendancePage (public)", () => {
  it("renders computed aggregates and no per-event table", async () => {
    mockedListAttendanceRecords.mockResolvedValue([
      {
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
      },
    ]);

    const ui = await AttendancePage();
    render(ui);

    expect(screen.getByText("Events tracked")).toBeInTheDocument();
    expect(screen.queryByText("Some Event")).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("falls back to an empty data set when Blobs isn't reachable at build time", async () => {
    mockedListAttendanceRecords.mockRejectedValue(
      new Error("no blobs context"),
    );

    const ui = await AttendancePage();
    render(ui);

    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
  });
});

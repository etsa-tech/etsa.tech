/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AttendanceBulkImport, {
  parseBulkImportLine,
} from "@/components/admin/AttendanceBulkImport";
import { AttendanceRecord } from "@/types/attendance";

function makeRecord(
  overrides: Partial<AttendanceRecord> = {},
): AttendanceRecord {
  return {
    id: "existing-id",
    eventDate: "2024-07-02",
    postSlug: "july-social",
    eventTitle: "july-social",
    format: "hybrid",
    inPersonCount: 1,
    virtualCount: 1,
    createdAt: "2024-07-02T00:00:00.000Z",
    updatedAt: "2024-07-02T00:00:00.000Z",
    updatedBy: null,
    ...overrides,
  };
}

describe("parseBulkImportLine", () => {
  it("parses a valid line", () => {
    expect(parseBulkImportLine("2024-07-02,july-social,hybrid,12,4")).toEqual({
      eventDate: "2024-07-02",
      postSlug: "july-social",
      eventTitle: "july-social",
      format: "hybrid",
      inPersonCount: 12,
      virtualCount: 4,
    });
  });

  it("returns null for too few fields", () => {
    expect(parseBulkImportLine("2024-07-02,july-social")).toBeNull();
  });

  it("returns null for an invalid format", () => {
    expect(
      parseBulkImportLine("2024-07-02,july-social,remote,12,4"),
    ).toBeNull();
  });

  it("returns null for non-numeric counts", () => {
    expect(
      parseBulkImportLine("2024-07-02,july-social,hybrid,abc,4"),
    ).toBeNull();
  });

  it("includes notes when a 6th field is present", () => {
    expect(
      parseBulkImportLine(
        "2024-07-02,july-social,hybrid,12,4,In person social",
      ),
    ).toEqual({
      eventDate: "2024-07-02",
      postSlug: "july-social",
      eventTitle: "july-social",
      format: "hybrid",
      inPersonCount: 12,
      virtualCount: 4,
      notes: "In person social",
    });
  });

  it("rejoins extra fields so a comma inside notes survives", () => {
    const result = parseBulkImportLine(
      "2024-07-02,july-social,hybrid,12,4,Great turnout, per Jerry",
    );
    expect(result?.notes).toBe("Great turnout, per Jerry");
  });

  it("omits notes entirely when the 6th field is blank", () => {
    const result = parseBulkImportLine("2024-07-02,july-social,hybrid,12,4,");
    expect(result?.notes).toBeUndefined();
  });
});

describe("AttendanceBulkImport", () => {
  it("imports valid rows and reports the success count", async () => {
    const onImportRow = jest.fn().mockResolvedValue(undefined);
    const onComplete = jest.fn();
    render(
      <AttendanceBulkImport
        existingRecords={[]}
        onImportRow={onImportRow}
        onComplete={onComplete}
      />,
    );

    await userEvent.type(
      screen.getByPlaceholderText(/2024-07-02/),
      "2024-07-02,july-social,hybrid,12,4\n2024-08-06,august-social,virtual,0,9",
    );
    await userEvent.click(screen.getByRole("button", { name: "Import rows" }));

    expect(onImportRow).toHaveBeenCalledTimes(2);
    expect(onImportRow).toHaveBeenCalledWith(
      expect.objectContaining({ postSlug: "july-social" }),
      undefined,
    );
    expect(await screen.findByText(/Imported 2 row\(s\)/)).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalled();
  });

  it("passes the existing record's id for a post that already has one, so it updates instead of duplicating", async () => {
    const onImportRow = jest.fn().mockResolvedValue(undefined);
    render(
      <AttendanceBulkImport
        existingRecords={[makeRecord({ id: "existing-id" })]}
        onImportRow={onImportRow}
        onComplete={jest.fn()}
      />,
    );

    await userEvent.type(
      screen.getByPlaceholderText(/2024-07-02/),
      "2024-07-02,july-social,hybrid,20,6",
    );
    await userEvent.click(screen.getByRole("button", { name: "Import rows" }));

    expect(onImportRow).toHaveBeenCalledTimes(1);
    expect(onImportRow).toHaveBeenCalledWith(
      expect.objectContaining({ postSlug: "july-social", inPersonCount: 20 }),
      "existing-id",
    );
  });

  it("dedupes a pasted CSV that lists the same post twice, keeping the last row", async () => {
    const onImportRow = jest.fn().mockResolvedValue(undefined);
    render(
      <AttendanceBulkImport
        existingRecords={[]}
        onImportRow={onImportRow}
        onComplete={jest.fn()}
      />,
    );

    await userEvent.type(
      screen.getByPlaceholderText(/2024-07-02/),
      "2024-07-02,july-social,hybrid,10,2\n2024-07-02,july-social,hybrid,13,0",
    );
    await userEvent.click(screen.getByRole("button", { name: "Import rows" }));

    expect(onImportRow).toHaveBeenCalledTimes(1);
    expect(onImportRow).toHaveBeenCalledWith(
      expect.objectContaining({ postSlug: "july-social", inPersonCount: 13 }),
      undefined,
    );
    expect(await screen.findByText(/Imported 1 row\(s\)/)).toBeInTheDocument();
  });

  it("counts unparseable or failed rows as failures", async () => {
    const onImportRow = jest.fn().mockRejectedValue(new Error("boom"));
    render(
      <AttendanceBulkImport
        existingRecords={[]}
        onImportRow={onImportRow}
        onComplete={jest.fn()}
      />,
    );

    await userEvent.type(
      screen.getByPlaceholderText(/2024-07-02/),
      "not,a,valid,line\n2024-07-02,july-social,hybrid,12,4",
    );
    await userEvent.click(screen.getByRole("button", { name: "Import rows" }));

    // "not,a,valid,line" fails parsing, the valid line fails onImportRow
    expect(await screen.findByText(/2 failed/)).toBeInTheDocument();
  });

  it("disables the import button when the textarea is empty", () => {
    render(
      <AttendanceBulkImport
        existingRecords={[]}
        onImportRow={jest.fn()}
        onComplete={jest.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Import rows" })).toBeDisabled();
  });
});

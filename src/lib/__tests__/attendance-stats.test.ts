import {
  computeAttendanceBySpeaker,
  computeAttendanceStats,
  computeOverallStats,
  computeYearlyStats,
} from "@/lib/attendance-stats";
import { AttendanceRecord } from "@/types/attendance";

function makeRecord(
  overrides: Partial<AttendanceRecord> = {},
): AttendanceRecord {
  return {
    id: "1",
    eventDate: "2025-01-01",
    postSlug: "slug",
    eventTitle: "Title",
    format: "hybrid",
    inPersonCount: 10,
    virtualCount: 5,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    updatedBy: null,
    ...overrides,
  };
}

describe("computeOverallStats", () => {
  it("returns zeroed stats for an empty list", () => {
    expect(computeOverallStats([])).toEqual({
      totalEvents: 0,
      avgTotal: 0,
      avgInPerson: 0,
      avgVirtual: 0,
      firstEventDate: null,
      lastEventDate: null,
    });
  });

  it("averages in-person and virtual counts across records", () => {
    const records = [
      makeRecord({
        eventDate: "2025-01-01",
        inPersonCount: 10,
        virtualCount: 4,
      }),
      makeRecord({
        eventDate: "2024-06-01",
        inPersonCount: 20,
        virtualCount: 6,
      }),
    ];
    const stats = computeOverallStats(records);
    expect(stats.totalEvents).toBe(2);
    expect(stats.avgInPerson).toBe(15);
    expect(stats.avgVirtual).toBe(5);
    expect(stats.avgTotal).toBe(20);
    expect(stats.firstEventDate).toBe("2024-06-01");
    expect(stats.lastEventDate).toBe("2025-01-01");
  });

  it("rounds averages to one decimal place", () => {
    const records = [
      makeRecord({ inPersonCount: 10, virtualCount: 0 }),
      makeRecord({ inPersonCount: 11, virtualCount: 0 }),
      makeRecord({ inPersonCount: 11, virtualCount: 0 }),
    ];
    expect(computeOverallStats(records).avgInPerson).toBeCloseTo(10.7, 5);
  });
});

describe("computeYearlyStats", () => {
  it("returns an empty array for no records", () => {
    expect(computeYearlyStats([])).toEqual([]);
  });

  it("groups records by year and sorts newest first", () => {
    const records = [
      makeRecord({
        eventDate: "2023-03-01",
        inPersonCount: 5,
        virtualCount: 0,
      }),
      makeRecord({
        eventDate: "2024-01-01",
        inPersonCount: 10,
        virtualCount: 2,
      }),
      makeRecord({
        eventDate: "2024-07-01",
        inPersonCount: 20,
        virtualCount: 4,
      }),
    ];
    const yearly = computeYearlyStats(records);
    expect(yearly.map((y) => y.year)).toEqual([2024, 2023]);
    expect(yearly[0].eventCount).toBe(2);
    expect(yearly[0].avgInPerson).toBe(15);
    expect(yearly[0].avgVirtual).toBe(3);
    expect(yearly[1].eventCount).toBe(1);
  });

  it("counts hybrid events toward both in-person and virtual averages", () => {
    const records = [
      makeRecord({
        eventDate: "2025-05-01",
        format: "hybrid",
        inPersonCount: 8,
        virtualCount: 3,
      }),
    ];
    const [year] = computeYearlyStats(records);
    expect(year.avgInPerson).toBe(8);
    expect(year.avgVirtual).toBe(3);
    expect(year.avgTotal).toBe(11);
  });
});

describe("computeAttendanceStats", () => {
  it("combines overall and yearly stats", () => {
    const records = [makeRecord()];
    const stats = computeAttendanceStats(records);
    expect(stats.overall.totalEvents).toBe(1);
    expect(stats.yearly).toHaveLength(1);
  });
});

describe("computeAttendanceBySpeaker", () => {
  it("returns an empty array when no records match a known speaker", () => {
    const records = [makeRecord({ postSlug: "a" })];
    expect(computeAttendanceBySpeaker(records, {})).toEqual([]);
  });

  it("attributes a record to every speaker on its post", () => {
    const records = [
      makeRecord({ postSlug: "a", inPersonCount: 10, virtualCount: 4 }),
    ];
    const stats = computeAttendanceBySpeaker(records, {
      a: ["Jane Doe", "Amy Zhou"],
    });
    expect(stats.map((s) => s.speakerName).sort()).toEqual([
      "Amy Zhou",
      "Jane Doe",
    ]);
    expect(stats.find((s) => s.speakerName === "Jane Doe")).toMatchObject({
      eventCount: 1,
      avgTotal: 14,
      avgInPerson: 10,
      avgVirtual: 4,
    });
  });

  it("averages across multiple events for the same speaker", () => {
    const records = [
      makeRecord({
        id: "1",
        postSlug: "a",
        inPersonCount: 10,
        virtualCount: 0,
      }),
      makeRecord({
        id: "2",
        postSlug: "b",
        inPersonCount: 20,
        virtualCount: 0,
      }),
    ];
    const stats = computeAttendanceBySpeaker(records, {
      a: ["Jane Doe"],
      b: ["Jane Doe"],
    });
    expect(stats).toMatchObject([
      {
        speakerName: "Jane Doe",
        eventCount: 2,
        avgTotal: 15,
        avgInPerson: 15,
        avgVirtual: 0,
      },
    ]);
  });

  it("includes the individual records behind the averages, sorted oldest first", () => {
    const records = [
      makeRecord({ id: "1", postSlug: "a", eventDate: "2025-06-01" }),
      makeRecord({ id: "2", postSlug: "a", eventDate: "2024-01-01" }),
    ];
    const [stats] = computeAttendanceBySpeaker(records, {
      a: ["Jane Doe"],
    });
    expect(stats.records.map((r) => r.id)).toEqual(["2", "1"]);
  });

  it("ignores events whose post has no speakers on file (e.g. socials)", () => {
    const records = [makeRecord({ postSlug: "social" })];
    expect(computeAttendanceBySpeaker(records, { social: [] })).toEqual([]);
  });

  it("sorts by event count descending, then speaker name ascending", () => {
    const records = [
      makeRecord({ id: "1", postSlug: "a" }),
      makeRecord({ id: "2", postSlug: "b" }),
      makeRecord({ id: "3", postSlug: "b" }),
    ];
    const stats = computeAttendanceBySpeaker(records, {
      a: ["Zed"],
      b: ["Amy"],
    });
    expect(stats.map((s) => s.speakerName)).toEqual(["Amy", "Zed"]);
  });
});

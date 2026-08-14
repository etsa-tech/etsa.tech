import {
  AttendanceRecord,
  AttendanceStats,
  OverallAttendanceStats,
  SpeakerAttendanceStats,
  YearlyAttendanceStats,
} from "@/types/attendance";

function average(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, value) => acc + value, 0);
  return Math.round((sum / values.length) * 10) / 10;
}

function totalCount(record: AttendanceRecord): number {
  return record.inPersonCount + record.virtualCount;
}

export function computeOverallStats(
  records: AttendanceRecord[],
): OverallAttendanceStats {
  if (records.length === 0) {
    return {
      totalEvents: 0,
      avgTotal: 0,
      avgInPerson: 0,
      avgVirtual: 0,
      firstEventDate: null,
      lastEventDate: null,
    };
  }

  const sortedDates = [...records]
    .map((record) => record.eventDate)
    .sort((a, b) => a.localeCompare(b));

  return {
    totalEvents: records.length,
    avgTotal: average(records.map(totalCount)),
    avgInPerson: average(records.map((record) => record.inPersonCount)),
    avgVirtual: average(records.map((record) => record.virtualCount)),
    firstEventDate: sortedDates[0],
    lastEventDate: sortedDates.at(-1) ?? null,
  };
}

export function computeYearlyStats(
  records: AttendanceRecord[],
): YearlyAttendanceStats[] {
  const byYear = new Map<number, AttendanceRecord[]>();

  for (const record of records) {
    // Parse the year from the YYYY-MM-DD string directly rather than via
    // `new Date(...).getFullYear()`, which is UTC-based and can shift an
    // event to the wrong year depending on the server's local timezone.
    const year = Number(record.eventDate.slice(0, 4));
    const yearRecords = byYear.get(year) ?? [];
    yearRecords.push(record);
    byYear.set(year, yearRecords);
  }

  return Array.from(byYear.entries())
    .map(([year, yearRecords]) => ({
      year,
      eventCount: yearRecords.length,
      avgTotal: average(yearRecords.map(totalCount)),
      avgInPerson: average(yearRecords.map((record) => record.inPersonCount)),
      avgVirtual: average(yearRecords.map((record) => record.virtualCount)),
    }))
    .sort((a, b) => b.year - a.year);
}

export function computeAttendanceStats(
  records: AttendanceRecord[],
): AttendanceStats {
  return {
    overall: computeOverallStats(records),
    yearly: computeYearlyStats(records),
  };
}

// Pure by design - takes a pre-computed postSlug -> speaker names map rather
// than reading posts itself, so this stays isomorphic (no server-only fs
// access) and callable from client components like the other functions
// here. The caller (an admin API route) builds that map from
// getPostSpeakers/getAllPosts in @/lib/blog. Events with no speaker on file
// (e.g. socials) simply don't contribute to any speaker's numbers.
export function computeAttendanceBySpeaker(
  records: AttendanceRecord[],
  speakerNamesByPostSlug: Record<string, string[]>,
): SpeakerAttendanceStats[] {
  const bySpeaker = new Map<string, AttendanceRecord[]>();

  for (const record of records) {
    const speakerNames = speakerNamesByPostSlug[record.postSlug] ?? [];
    for (const speakerName of speakerNames) {
      const speakerRecords = bySpeaker.get(speakerName) ?? [];
      speakerRecords.push(record);
      bySpeaker.set(speakerName, speakerRecords);
    }
  }

  return Array.from(bySpeaker.entries())
    .map(([speakerName, speakerRecords]) => ({
      speakerName,
      eventCount: speakerRecords.length,
      avgTotal: average(speakerRecords.map(totalCount)),
      avgInPerson: average(
        speakerRecords.map((record) => record.inPersonCount),
      ),
      avgVirtual: average(speakerRecords.map((record) => record.virtualCount)),
      records: [...speakerRecords].sort((a, b) =>
        a.eventDate.localeCompare(b.eventDate),
      ),
    }))
    .sort(
      (a, b) =>
        b.eventCount - a.eventCount ||
        a.speakerName.localeCompare(b.speakerName),
    );
}

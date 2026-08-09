import {
  jaroWinklerSimilarity,
  normalizeName,
  clusterEntriesByName,
  type NamedEntry,
} from "@/lib/name-matching";

describe("jaroWinklerSimilarity", () => {
  it("returns 1 for identical strings", () => {
    expect(jaroWinklerSimilarity("ben", "ben")).toBe(1);
  });

  it("returns 0 for completely dissimilar strings", () => {
    expect(jaroWinklerSimilarity("abc", "xyz")).toBe(0);
  });

  it("returns 0 when either string is empty", () => {
    expect(jaroWinklerSimilarity("", "abc")).toBe(0);
    expect(jaroWinklerSimilarity("abc", "")).toBe(0);
  });

  it("scores a shared prefix higher than the base Jaro score", () => {
    const withPrefix = jaroWinklerSimilarity("ben taylor", "ben t");
    const noPrefixShare = jaroWinklerSimilarity("xben taylor", "yben t");
    expect(withPrefix).toBeGreaterThan(0.8);
    expect(withPrefix).toBeGreaterThanOrEqual(noPrefixShare);
  });

  it("accounts for transpositions", () => {
    const score = jaroWinklerSimilarity("martha", "marhta");
    expect(score).toBeGreaterThan(0.9);
    expect(score).toBeLessThan(1);
  });
});

describe("normalizeName", () => {
  it("trims, lowercases, and collapses internal whitespace", () => {
    expect(normalizeName("  Ben   Taylor  ")).toBe("ben taylor");
  });
});

describe("clusterEntriesByName", () => {
  function entry(id: string, name: string, source: string): NamedEntry {
    return { id, name, source };
  }

  it("groups similar names into one cluster", () => {
    const entries = [
      entry("1", "Ben Taylor", "rsvp"),
      entry("2", "ben taylor", "sheet"),
    ];
    const clusters = clusterEntriesByName(entries, 0.9);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].mergedFrom).toHaveLength(2);
    expect(clusters[0].sources).toEqual(["rsvp", "sheet"]);
  });

  it("keeps dissimilar names in separate clusters", () => {
    const entries = [
      entry("1", "Ben Taylor", "rsvp"),
      entry("2", "Amy Zhou", "rsvp"),
    ];
    const clusters = clusterEntriesByName(entries, 0.9);
    expect(clusters).toHaveLength(2);
  });

  it("skips entries with a blank name", () => {
    const entries = [
      entry("1", "   ", "rsvp"),
      entry("2", "Ben Taylor", "rsvp"),
    ];
    const clusters = clusterEntriesByName(entries, 0.9);
    expect(clusters).toHaveLength(1);
  });

  it("prefers the longest name as the cluster display name and tracks its primary entry", () => {
    const entries = [
      entry("1", "Ben T", "rsvp"),
      entry("2", "Ben Taylor", "sheet"),
    ];
    const clusters = clusterEntriesByName(entries, 0.85);
    expect(clusters[0].name).toBe("Ben Taylor");
    expect(clusters[0].primaryEntry.id).toBe("2");
  });

  it("does not duplicate a source already recorded on the cluster", () => {
    const entries = [
      entry("1", "Ben Taylor", "rsvp"),
      entry("2", "Ben Taylor", "rsvp"),
    ];
    const clusters = clusterEntriesByName(entries, 0.9);
    expect(clusters[0].sources).toEqual(["rsvp"]);
    expect(clusters[0].mergedFrom).toHaveLength(2);
  });

  it("backfills a missing timestamp from a later merged entry", () => {
    const entries = [
      entry("1", "Ben Taylor", "rsvp"),
      { ...entry("2", "Ben Taylor", "sheet"), timestamp: "2026-01-01" },
    ];
    const clusters = clusterEntriesByName(entries, 0.9);
    expect(clusters[0].timestamp).toBe("2026-01-01");
  });
});

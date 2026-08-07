// Jaro-Winkler string similarity, 0 (no match) to 1 (identical). Favors
// matching prefixes, which suits names well ("Ben Taylor" vs "Ben T.").
export function jaroWinklerSimilarity(a: string, b: string): number {
  const jaro = jaroSimilarity(a, b);
  if (jaro === 0) return 0;

  const maxPrefix = 4;
  const prefixScale = 0.1;
  let prefixLength = 0;
  for (let i = 0; i < Math.min(maxPrefix, a.length, b.length); i++) {
    if (a[i] !== b[i]) break;
    prefixLength++;
  }

  return jaro + prefixLength * prefixScale * (1 - jaro);
}

function jaroSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  const len1 = s1.length;
  const len2 = s2.length;
  if (len1 === 0 || len2 === 0) return 0;

  const matchWindow = Math.max(0, Math.floor(Math.max(len1, len2) / 2) - 1);
  const s1Matches = new Array<boolean>(len1).fill(false);
  const s2Matches = new Array<boolean>(len2).fill(false);

  let matches = 0;
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, len2);
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0;

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  return (
    (matches / len1 +
      matches / len2 +
      (matches - transpositions / 2) / matches) /
    3
  );
}

export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export interface NamedEntry {
  // Unique per raw entry (not derived from name/source) so entries that
  // legitimately share a name and source - e.g. the same person RSVPing
  // twice - don't collide when used as a React key.
  id: string;
  name: string;
  source: string;
  timestamp?: string;
  comments?: string;
}

export interface EntryCluster {
  name: string;
  sources: string[];
  timestamp?: string;
  mergedFrom: NamedEntry[];
  // The specific entry `name` was taken from - tracked by reference rather
  // than comparing name strings, since two merged entries can share the
  // exact same name text (e.g. the same person submitting the Sheet form
  // twice) and a string comparison would then match/exclude both at once.
  primaryEntry: NamedEntry;
}

// Greedy nearest-cluster grouping - fine at RSVP-list scale (dozens of
// entries, not thousands). Each entry joins the most similar existing
// cluster if it clears the confidence threshold, else starts a new one.
export function clusterEntriesByName(
  entries: NamedEntry[],
  confidenceThreshold: number,
): EntryCluster[] {
  const clusters: EntryCluster[] = [];

  for (const entry of entries) {
    const trimmedName = entry.name.trim();
    if (!trimmedName) continue;
    const normalized = normalizeName(trimmedName);

    let bestCluster: EntryCluster | null = null;
    let bestScore = 0;
    for (const cluster of clusters) {
      const score = jaroWinklerSimilarity(
        normalized,
        normalizeName(cluster.name),
      );
      if (score > bestScore) {
        bestScore = score;
        bestCluster = cluster;
      }
    }

    if (bestCluster && bestScore >= confidenceThreshold) {
      bestCluster.mergedFrom.push(entry);
      if (!bestCluster.sources.includes(entry.source)) {
        bestCluster.sources.push(entry.source);
      }
      // Prefer the most complete-looking name (longest) as the display name.
      if (trimmedName.length > bestCluster.name.length) {
        bestCluster.name = trimmedName;
        bestCluster.primaryEntry = entry;
      }
      if (!bestCluster.timestamp && entry.timestamp) {
        bestCluster.timestamp = entry.timestamp;
      }
    } else {
      clusters.push({
        name: trimmedName,
        sources: [entry.source],
        timestamp: entry.timestamp,
        mergedFrom: [entry],
        primaryEntry: entry,
      });
    }
  }

  return clusters;
}

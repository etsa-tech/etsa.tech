import type { PostFrontmatter, Speaker } from "@/types/post";

// Frontmatter carries speakers in one of two shapes (legacy single-speaker
// fields, or a `speakers` array) - these helpers read/write whichever shape
// a given post actually uses, so the promote and unlink routes don't each
// re-implement the same lookup.

function findSpeakerIndex(
  frontmatter: PostFrontmatter,
  speakerName: string,
): number {
  if (!Array.isArray(frontmatter.speakers)) return -1;
  return frontmatter.speakers.findIndex(
    (speaker: Speaker) =>
      speaker.name.toLowerCase() === speakerName.toLowerCase(),
  );
}

function isLegacyMatch(
  frontmatter: PostFrontmatter,
  speakerName: string,
): boolean {
  return (
    typeof frontmatter.speakerName === "string" &&
    frontmatter.speakerName.toLowerCase() === speakerName.toLowerCase()
  );
}

export function getSpeakerLinkedInUrnFromFrontmatter(
  frontmatter: PostFrontmatter,
  speakerName: string,
): string | null {
  const index = findSpeakerIndex(frontmatter, speakerName);
  if (index !== -1 && frontmatter.speakers![index].linkedInUrn) {
    return frontmatter.speakers![index].linkedInUrn as string;
  }
  if (
    isLegacyMatch(frontmatter, speakerName) &&
    frontmatter.speakerLinkedInUrn
  ) {
    return frontmatter.speakerLinkedInUrn;
  }
  return null;
}

export function setSpeakerLinkedInUrnInFrontmatter(
  frontmatter: PostFrontmatter,
  speakerName: string,
  urn: string,
): void {
  const index = findSpeakerIndex(frontmatter, speakerName);
  if (index !== -1) {
    frontmatter.speakers![index] = {
      ...frontmatter.speakers![index],
      linkedInUrn: urn,
    };
    return;
  }
  frontmatter.speakerLinkedInUrn = urn;
}

export function clearSpeakerLinkedInUrnFromFrontmatter(
  frontmatter: PostFrontmatter,
  speakerName: string,
): void {
  const index = findSpeakerIndex(frontmatter, speakerName);
  if (index !== -1 && frontmatter.speakers![index].linkedInUrn) {
    const updatedSpeaker = { ...frontmatter.speakers![index] };
    delete updatedSpeaker.linkedInUrn;
    frontmatter.speakers![index] = updatedSpeaker;
  }
  if (
    isLegacyMatch(frontmatter, speakerName) &&
    frontmatter.speakerLinkedInUrn
  ) {
    delete frontmatter.speakerLinkedInUrn;
  }
}

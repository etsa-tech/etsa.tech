import "server-only";
import { composeLinkedInPost } from "@/lib/linkedin/compose";
import { getPublishedPostFrontmatter } from "@/lib/social/post-data";
import { getPostSpeakers, getSocialContentFields } from "@/lib/utils";
import { getSpeakerLinkedInUrn } from "@/lib/speaker-linkedin-store";

// The auto-generated LinkedIn post text for a given post, before any
// manual admin edits - shared by the draft-preview route (to show/reset to
// this template) and the post callback (as the fallback when no draft was
// ever saved).
export async function buildDefaultLinkedInCommentary(
  slug: string,
): Promise<string> {
  const frontmatter = await getPublishedPostFrontmatter(slug);
  const content = getSocialContentFields(frontmatter);
  const [speaker] = getPostSpeakers(frontmatter);
  // A manually-set frontmatter urn (for a known repeat speaker) wins over
  // the connect-flow store; otherwise fall back to whatever that speaker
  // has captured via their own one-time LinkedIn connect, if anything.
  const speakerUrn =
    speaker?.linkedInUrn ??
    (content.speakerName
      ? await getSpeakerLinkedInUrn(content.speakerName)
      : null);

  return composeLinkedInPost({
    title: frontmatter.title,
    abstract: content.abstract,
    date: content.date,
    speakerName: content.speakerName,
    company: content.company,
    speakerLinkedInUrl: speaker?.linkedIn,
    speakerLinkedInUrn: speakerUrn ?? undefined,
  });
}

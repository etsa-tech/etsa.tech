import fs from "node:fs";
import path from "node:path";

export interface LinkedInPostInput {
  title: string;
  abstract: string;
  date: string;
  speakerName: string;
  company: string;
  speakerLinkedInUrl?: string;
  speakerLinkedInUrn?: string;
}

// The wording lives in public/linkedin-post-template.md (not here) so a
// board member can tweak the copy without a code change - this file only
// fills in the placeholders it can't leave to plain text: the
// speaker-credit line has real conditional logic, and the Meetup link and
// RSVP/doors copy come from env/config.
const TEMPLATE_PATH = path.join(
  process.cwd(),
  "public/linkedin-post-template.md",
);

// A real, notifying @mention needs the speaker's LinkedIn member URN, which
// only exists once they've done their own one-time LinkedIn connect - falls
// back to a plain (non-tagging) profile link, then to just their name.
// Only called once speakerName is known truthy - see formatIntroLine.
function formatSpeakerCredit(input: LinkedInPostInput): string {
  if (input.speakerLinkedInUrn) {
    return `@[${input.speakerName}](urn:li:person:${input.speakerLinkedInUrn})`;
  }
  if (input.speakerLinkedInUrl) {
    return `${input.speakerName} (${input.speakerLinkedInUrl})`;
  }
  return input.speakerName;
}

// Talk posts lead with who's presenting; posts with no speaker (socials,
// meet-and-greets) skip straight to what the event is, since there's no one
// to credit.
function formatIntroLine(input: LinkedInPostInput): string {
  if (!input.speakerName) {
    return `Join us on ${input.date} at 7:00PM for ${input.title}`;
  }

  const speakerCredit = [formatSpeakerCredit(input), input.company]
    .filter(Boolean)
    .join(" @ ");

  return `Join us on ${input.date} at 7:00PM and join ${speakerCredit} present on ${input.title}`;
}

export function composeLinkedInPost(input: LinkedInPostInput): string {
  const template = fs.readFileSync(TEMPLATE_PATH, "utf8").trimEnd();
  const meetupUrl = process.env.NEXT_PUBLIC_MEETUP_URL ?? "";

  return template
    .replace("{{introLine}}", formatIntroLine(input))
    .replace("{{abstract}}", input.abstract)
    .replace("{{meetupUrl}}", meetupUrl);
}

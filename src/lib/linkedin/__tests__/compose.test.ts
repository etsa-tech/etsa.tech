import { composeLinkedInPost } from "@/lib/linkedin/compose";

const BASE = {
  title: "Intro to Kubernetes",
  abstract: "Learn the fundamentals.",
  date: "2026-03-15",
  speakerName: "Jane Doe",
  company: "Acme",
};

describe("composeLinkedInPost", () => {
  const originalMeetupUrl = process.env.NEXT_PUBLIC_MEETUP_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_MEETUP_URL = "https://www.meetup.com/lopsa-etenn/";
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_MEETUP_URL = originalMeetupUrl;
  });

  it("uses a real notifying mention when a speaker URN is known", () => {
    const text = composeLinkedInPost({
      ...BASE,
      speakerLinkedInUrn: "abc123",
    });
    expect(text).toContain("@[Jane Doe](urn:li:person:abc123)");
    expect(text).not.toContain("linkedin.com");
  });

  it("falls back to a plain profile link when there's no URN", () => {
    const text = composeLinkedInPost({
      ...BASE,
      speakerLinkedInUrl: "https://linkedin.com/in/janedoe",
    });
    expect(text).toContain("Jane Doe (https://linkedin.com/in/janedoe)");
  });

  it("prefers the URN mention over a plain link when both are present", () => {
    const text = composeLinkedInPost({
      ...BASE,
      speakerLinkedInUrn: "abc123",
      speakerLinkedInUrl: "https://linkedin.com/in/janedoe",
    });
    expect(text).toContain("@[Jane Doe](urn:li:person:abc123)");
    expect(text).not.toContain("https://linkedin.com/in/janedoe");
  });

  it("falls back to just the name when there's no URN or profile link", () => {
    const text = composeLinkedInPost(BASE);
    expect(text).toContain("Jane Doe @ Acme");
  });

  it("omits company from the speaker credit when missing", () => {
    const text = composeLinkedInPost({ ...BASE, company: "" });
    expect(text).toContain("join Jane Doe present on");
    expect(text).not.toContain(" @ ");
  });

  it("skips straight to the event when there's no speaker name", () => {
    const text = composeLinkedInPost({ ...BASE, speakerName: "", company: "" });
    expect(text).toBe(
      "Join us on 2026-03-15 at 7:00PM for Intro to Kubernetes\n\n" +
        "Learn the fundamentals.\n\n" +
        "Please RSVP on our website https://etsa.tech/rsvp or on Meetup https://www.meetup.com/lopsa-etenn/\n\n" +
        "Doors open at 6:00PM at KEC downtown and the talk starts at 7:00PM",
    );
  });

  it("fills in the intro line, abstract, and Meetup link from the template", () => {
    const text = composeLinkedInPost(BASE);
    expect(text).toBe(
      "Join us on 2026-03-15 at 7:00PM and join Jane Doe @ Acme present on Intro to Kubernetes\n\n" +
        "Learn the fundamentals.\n\n" +
        "Please RSVP on our website https://etsa.tech/rsvp or on Meetup https://www.meetup.com/lopsa-etenn/\n\n" +
        "Doors open at 6:00PM at KEC downtown and the talk starts at 7:00PM",
    );
  });

  it("falls back to an empty Meetup link when the env var is unset", () => {
    delete process.env.NEXT_PUBLIC_MEETUP_URL;
    const text = composeLinkedInPost(BASE);
    expect(text).toContain("or on Meetup \n\n");
  });
});

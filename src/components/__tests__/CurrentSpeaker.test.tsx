/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { CurrentSpeaker } from "@/components/CurrentSpeaker";
import type { PostSummary } from "@/types/post";

describe("CurrentSpeaker", () => {
  it("shows a placeholder when there's no latest post", () => {
    render(<CurrentSpeaker latestPost={null} />);
    expect(screen.getByText("No upcoming speakers")).toBeInTheDocument();
  });

  it("renders full speaker and presentation details", () => {
    const post: PostSummary = {
      slug: "my-talk",
      readingTime: 5,
      frontmatter: {
        title: "Fallback Title",
        date: "2026-01-01",
        excerpt: "x",
        tags: [],
        speakerName: "Jane Doe",
        speakerTitle: "Engineer",
        speakerCompany: "Acme",
        speakerBio: "Bio text",
        presentationTitle: "Great Talk",
        eventDate: "2026-02-01",
        eventLocation: "Room A",
      } as never,
    };
    render(<CurrentSpeaker latestPost={post} />);
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("Engineer at Acme")).toBeInTheDocument();
    expect(screen.getByText("Bio text")).toBeInTheDocument();
    expect(screen.getByText("Great Talk")).toBeInTheDocument();
    expect(screen.getByText(/Room A/)).toBeInTheDocument();
  });

  it("falls back to the post title when there's no presentationTitle, and hides speaker block when no speakerName", () => {
    const post: PostSummary = {
      slug: "my-talk",
      readingTime: 5,
      frontmatter: {
        title: "Fallback Title",
        date: "2026-01-01",
        excerpt: "x",
        tags: [],
      } as never,
    };
    render(<CurrentSpeaker latestPost={post} />);
    expect(screen.getByText("Fallback Title")).toBeInTheDocument();
  });
});

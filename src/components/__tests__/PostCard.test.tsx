/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { PostCard } from "@/components/PostCard";
import type { PostSummary } from "@/types/post";

function post(
  overrides: Partial<PostSummary["frontmatter"]> = {},
): PostSummary {
  return {
    slug: "my-post",
    readingTime: 4,
    frontmatter: {
      title: "My Post",
      date: "2026-01-01",
      excerpt: "An excerpt",
      tags: ["react", "testing"],
      ...overrides,
    } as PostSummary["frontmatter"],
  };
}

describe("PostCard", () => {
  it("renders title, excerpt, reading time, and tags", () => {
    render(<PostCard post={post()} />);
    expect(screen.getByText("My Post")).toBeInTheDocument();
    expect(screen.getByText("An excerpt")).toBeInTheDocument();
    expect(screen.getByText("4 min read")).toBeInTheDocument();
    expect(screen.getByText("react")).toBeInTheDocument();
  });

  it("shows a speaker byline for a presentation post with a speaker", () => {
    render(<PostCard post={post({ speakerName: "Jane Doe" } as never)} />);
    expect(screen.getByText(/Speaker:/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Jane Doe" })).toBeInTheDocument();
  });

  it("pluralizes the speaker label when there is more than one speaker", () => {
    render(
      <PostCard
        post={post({
          speakers: [{ name: "Jane Doe" }, { name: "John Smith" }],
        } as never)}
      />,
    );
    expect(screen.getByText(/Speakers:/)).toBeInTheDocument();
  });

  it("hides speakers when showSpeakers is false", () => {
    render(
      <PostCard
        post={post({ speakerName: "Jane Doe" } as never)}
        showSpeakers={false}
      />,
    );
    expect(screen.queryByText(/Speaker:/)).not.toBeInTheDocument();
  });

  it("hides speakers for blog posts even when a speaker is set", () => {
    render(
      <PostCard
        post={post({ speakerName: "Jane Doe", blogpost: true } as never)}
      />,
    );
    expect(screen.queryByText(/Speaker:/)).not.toBeInTheDocument();
  });

  it("omits the tags section when there are none", () => {
    render(<PostCard post={post({ tags: [] })} />);
    expect(screen.queryByText("react")).not.toBeInTheDocument();
  });
});

/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BlogSearchComponent from "@/components/BlogSearchComponent";
import type { PostSummary } from "@/types/post";

function post(slug: string, title: string, tags: string[] = []): PostSummary {
  return {
    slug,
    readingTime: 1,
    frontmatter: {
      title,
      date: "2026-01-01",
      excerpt: `${title} excerpt`,
      tags,
    } as PostSummary["frontmatter"],
  };
}

const posts = [
  post("a", "React Basics", ["react"]),
  post("b", "Node Tips", ["node"]),
];

describe("BlogSearchComponent", () => {
  it("shows all posts by default", () => {
    render(<BlogSearchComponent posts={posts} />);
    expect(screen.getByText("React Basics")).toBeInTheDocument();
    expect(screen.getByText("Node Tips")).toBeInTheDocument();
  });

  it("filters posts as the user types", async () => {
    render(<BlogSearchComponent posts={posts} />);
    await userEvent.type(
      screen.getByPlaceholderText("Search blog posts..."),
      "react",
    );
    expect(screen.getByText("React Basics")).toBeInTheDocument();
    expect(screen.queryByText("Node Tips")).not.toBeInTheDocument();
    expect(screen.getByText(/Found 1 blog post for/)).toBeInTheDocument();
  });

  it("shows an empty state with a clear action when nothing matches", async () => {
    render(<BlogSearchComponent posts={posts} />);
    await userEvent.type(
      screen.getByPlaceholderText("Search blog posts..."),
      "nonexistent",
    );
    expect(screen.getByText("No blog posts found")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear Search" }));
    expect(screen.getByText("React Basics")).toBeInTheDocument();
  });

  it("clears the search via the inline clear button", async () => {
    render(<BlogSearchComponent posts={posts} />);
    await userEvent.type(
      screen.getByPlaceholderText("Search blog posts..."),
      "react",
    );
    const buttons = screen.getAllByRole("button");
    await userEvent.click(buttons[0]);
    expect(screen.getByText("Node Tips")).toBeInTheDocument();
  });
});

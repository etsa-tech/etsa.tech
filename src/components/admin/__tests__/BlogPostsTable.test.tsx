/**
 * @jest-environment jsdom
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BlogPostsTable from "@/components/admin/BlogPostsTable";

// The "Showing X to Y of Z results" text interleaves plain text with <span>
// numbers, so getByText's default direct-text-node matching never sees the
// full string on one node - match on an element's full textContent instead.
function getByFullText(text: string) {
  return screen.getByText(
    (_, node) => node?.tagName === "P" && node.textContent === text,
  );
}

function post(
  name: string,
  overrides: Partial<{
    speakerName: string;
    speakerImage: string;
    blogpost: boolean;
    published: boolean;
  }> = {},
) {
  return {
    name: `${name}.md`,
    path: `posts/${name}.md`,
    size: 2048,
    frontmatter: {
      title: name,
      date: "2026-01-01",
      speakerName: overrides.speakerName ?? "Jane Doe",
      speakerImage: overrides.speakerImage,
      blogpost: overrides.blogpost,
      published: overrides.published,
    },
  };
}

describe("BlogPostsTable", () => {
  it("shows a loading skeleton when isLoading is true", () => {
    const { container } = render(<BlogPostsTable posts={[]} isLoading />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("shows an empty state with a create-post CTA when there are no posts", () => {
    render(<BlogPostsTable posts={[]} />);
    expect(screen.getByText("No blog posts")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Create New Post" }),
    ).toBeInTheDocument();
  });

  it("parses date and title out of the filename and renders speaker/title/date", () => {
    render(<BlogPostsTable posts={[post("2026-01-15-my-great-talk")]} />);
    expect(screen.getAllByText("my great talk").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Jane Doe").length).toBeGreaterThan(0);
    expect(screen.getAllByText("January 15, 2026").length).toBeGreaterThan(0);
  });

  it("shows 'No date' when the filename has no date prefix", () => {
    render(<BlogPostsTable posts={[post("no-date-slug")]} />);
    expect(screen.getAllByText("No date").length).toBeGreaterThan(0);
  });

  it("shows an initials avatar fallback when there's no speaker image", () => {
    render(
      <BlogPostsTable
        posts={[post("2026-01-01-x", { speakerName: "Amy Zhou" })]}
      />,
    );
    expect(screen.getAllByText("A").length).toBeGreaterThan(0);
  });

  it("falls back to 'Unknown Speaker' when no speaker info is present", () => {
    const noSpeaker = {
      name: "2026-01-01-x.md",
      path: "posts/2026-01-01-x.md",
      size: 100,
      frontmatter: { title: "x", date: "2026-01-01" },
    };
    render(<BlogPostsTable posts={[noSpeaker]} />);
    expect(screen.getAllByText("Unknown Speaker").length).toBeGreaterThan(0);
  });

  it("filters by search term across title and speaker", async () => {
    render(
      <BlogPostsTable
        posts={[
          post("2026-01-01-react-basics", { speakerName: "Jane Doe" }),
          post("2026-01-02-node-tips", { speakerName: "Amy Zhou" }),
        ]}
      />,
    );
    await userEvent.type(screen.getByPlaceholderText(/Search posts/), "react");
    expect(screen.getAllByText("react basics").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("node tips")).toHaveLength(0);
  });

  it("shows a search-specific empty message when the search matches nothing", async () => {
    render(<BlogPostsTable posts={[post("2026-01-01-react-basics")]} />);
    await userEvent.type(
      screen.getByPlaceholderText(/Search posts/),
      "nomatch",
    );
    expect(screen.getByText("No posts found")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Create New Post" }),
    ).not.toBeInTheDocument();
  });

  it("shows the social action link only for presentation posts, not blog posts", () => {
    render(
      <BlogPostsTable
        posts={[
          post("2026-01-01-a-talk", { blogpost: false }),
          post("2026-01-02-a-post", { blogpost: true }),
        ]}
      />,
    );
    expect(
      screen.getAllByLabelText(/Social mailing for a talk/).length,
    ).toBeGreaterThan(0);
    expect(
      screen.queryAllByLabelText(/Social mailing for a post/),
    ).toHaveLength(0);
  });

  it("shows an Attendance action link for every post", () => {
    render(<BlogPostsTable posts={[post("2026-01-01-a-talk")]} />);
    const links = screen.getAllByLabelText(/Attendance for a talk/);
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]).toHaveAttribute(
      "href",
      "/admin/posts/2026-01-01-a-talk/attendance",
    );
  });

  it("sorts by clicking column headers and toggles direction", async () => {
    render(
      <BlogPostsTable
        posts={[
          post("2026-01-01-bbb", { speakerName: "Bob" }),
          post("2026-01-02-aaa", { speakerName: "Amy" }),
        ]}
      />,
    );
    const table = screen.getByRole("table");
    await userEvent.click(within(table).getByText("Post Name"));
    // New column -> desc by default: "bbb" > "aaa"
    let rows = within(table).getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("bbb")).toBeInTheDocument();

    await userEvent.click(within(table).getByText("Post Name"));
    rows = within(table).getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("aaa")).toBeInTheDocument();

    // Toggle back to desc to exercise the asc->desc direction branch too.
    await userEvent.click(within(table).getByText("Post Name"));
    rows = within(table).getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("bbb")).toBeInTheDocument();
  });

  it("sorts by the Speaker column", async () => {
    render(
      <BlogPostsTable
        posts={[
          post("2026-01-01-bbb", { speakerName: "Bob" }),
          post("2026-01-02-aaa", { speakerName: "Amy" }),
        ]}
      />,
    );
    const table = screen.getByRole("table");
    await userEvent.click(within(table).getByText("Speaker"));
    const rows = within(table).getAllByRole("row").slice(1);
    // New column -> desc by default: "Bob" > "Amy"
    expect(within(rows[0]).getByText("Bob")).toBeInTheDocument();
  });

  it("sorts by the Date column", async () => {
    // The sortable "date" is parsed from the filename's YYYY-MM-DD prefix,
    // not frontmatter.date.
    render(
      <BlogPostsTable
        posts={[post("2026-01-01-bbb"), post("2026-01-02-aaa")]}
      />,
    );
    const table = screen.getByRole("table");
    // "date" is already the default sort field (desc, so aaa leads by
    // default) - clicking its header toggles direction to asc instead of
    // starting a new column, putting the earlier date (bbb) first.
    await userEvent.click(within(table).getByText("Date"));
    const rows = within(table).getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("bbb")).toBeInTheDocument();
  });

  it("renders a speaker image when the post has one", () => {
    render(
      <BlogPostsTable
        posts={[post("2026-01-01-bbb", { speakerImage: "/jane.jpg" })]}
      />,
    );
    expect(screen.getAllByAltText("Jane Doe").length).toBeGreaterThan(0);
  });

  it("paginates results and navigates via Next/Previous", async () => {
    const posts = Array.from({ length: 12 }, (_, i) =>
      post(`2026-01-${String(i + 1).padStart(2, "0")}-post-${i}`),
    );
    render(<BlogPostsTable posts={posts} />);

    // 10 per page by default -> 2 pages.
    expect(getByFullText("Showing 1 to 10 of 12 results")).toBeInTheDocument();

    // Mobile Next/Previous buttons (hidden via CSS but still rendered and
    // clickable in jsdom) are the first pair.
    const nextButtons = screen.getAllByRole("button", { name: "Next" });
    await userEvent.click(nextButtons[0]);
    expect(getByFullText("Showing 11 to 12 of 12 results")).toBeInTheDocument();

    const prevButtons = screen.getAllByRole("button", { name: "Previous" });
    await userEvent.click(prevButtons[0]);
    expect(getByFullText("Showing 1 to 10 of 12 results")).toBeInTheDocument();

    await userEvent.click(nextButtons[nextButtons.length - 1]);
    expect(getByFullText("Showing 11 to 12 of 12 results")).toBeInTheDocument();

    await userEvent.click(prevButtons[prevButtons.length - 1]);
    expect(getByFullText("Showing 1 to 10 of 12 results")).toBeInTheDocument();
  });

  it("jumps to a specific page number and resets to page 1 on a new search", async () => {
    const posts = Array.from({ length: 25 }, (_, i) =>
      post(`2026-01-${String((i % 28) + 1).padStart(2, "0")}-post-${i}`),
    );
    render(<BlogPostsTable posts={posts} />);
    await userEvent.selectOptions(screen.getByLabelText("Show:"), "5");
    // 25 posts / 5 per page = 5 pages. From page 1, the window renders
    // buttons 1, 2, and 5 directly; page 2 is the reachable numbered button.
    await userEvent.click(screen.getByRole("button", { name: "2" }));
    expect(getByFullText("Showing 6 to 10 of 25 results")).toBeInTheDocument();

    // "post 1" matches "post 1" and "post 10".."post 19" (11 titles - title
    // extraction turns the filename's hyphens into spaces), which still
    // spans more than one page and so keeps the pagination summary visible.
    await userEvent.type(screen.getByPlaceholderText(/Search posts/), "post 1");
    expect(
      screen.getByText(
        (_, node) =>
          node?.tagName === "P" &&
          !!node.textContent?.startsWith("Showing 1 to"),
      ),
    ).toBeInTheDocument();
  });

  it("changes items per page via the page-size select", async () => {
    const posts = Array.from({ length: 8 }, (_, i) =>
      post(`2026-01-01-post-${i}`),
    );
    render(<BlogPostsTable posts={posts} />);
    await userEvent.selectOptions(screen.getByLabelText("Show:"), "5");
    expect(getByFullText("Showing 1 to 5 of 8 results")).toBeInTheDocument();
  });
});

/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SearchComponent, {
  SearchSuggestions,
} from "@/components/SearchComponent";
import type { PostSummary } from "@/types/post";

function post(
  slug: string,
  title: string,
  overrides: Partial<PostSummary["frontmatter"]> = {},
): PostSummary {
  return {
    slug,
    readingTime: 1,
    frontmatter: {
      title,
      date: "2026-01-01",
      excerpt: `${title} excerpt`,
      tags: [],
      ...overrides,
    } as PostSummary["frontmatter"],
  };
}

const posts = [
  post("a", "React Basics", { tags: ["react"] }),
  post("b", "DevOps Talk", {
    speakerName: "Jane Doe",
    speakerCompany: "Acme",
  } as never),
];

describe("SearchComponent", () => {
  it("shows all posts with no query", () => {
    render(<SearchComponent posts={posts} />);
    expect(screen.getByText("React Basics")).toBeInTheDocument();
    expect(screen.getByText("DevOps Talk")).toBeInTheDocument();
  });

  it("filters by content match and shows a results header", async () => {
    render(<SearchComponent posts={posts} />);
    await userEvent.type(
      screen.getByPlaceholderText(/Search by title/),
      "react",
    );
    expect(screen.getByText("Search Results")).toBeInTheDocument();
    expect(screen.getByText("React Basics")).toBeInTheDocument();
    expect(screen.queryByText("DevOps Talk")).not.toBeInTheDocument();
  });

  it("matches on speaker name/company", async () => {
    render(<SearchComponent posts={posts} />);
    await userEvent.type(
      screen.getByPlaceholderText(/Search by title/),
      "Acme",
    );
    expect(screen.getByText("DevOps Talk")).toBeInTheDocument();
    expect(screen.queryByText("React Basics")).not.toBeInTheDocument();
  });

  it("shows an empty state with a reset action when nothing matches", async () => {
    render(<SearchComponent posts={posts} />);
    await userEvent.type(
      screen.getByPlaceholderText(/Search by title/),
      "nomatch",
    );
    expect(screen.getByText("No presentations found")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Show All Presentations" }),
    );
    expect(screen.getByText("React Basics")).toBeInTheDocument();
  });

  it("clears the query via the inline clear button", async () => {
    render(<SearchComponent posts={posts} />);
    await userEvent.type(
      screen.getByPlaceholderText(/Search by title/),
      "react",
    );
    await userEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByText("DevOps Talk")).toBeInTheDocument();
  });

  it("stops the searching state when the input is typed back down to empty", async () => {
    render(<SearchComponent posts={posts} />);
    const input = screen.getByPlaceholderText(/Search by title/);
    await userEvent.type(input, "react");
    await userEvent.clear(input);
    expect(screen.getByText("React Basics")).toBeInTheDocument();
    expect(screen.getByText("DevOps Talk")).toBeInTheDocument();
  });

  it("renders nothing extra with an empty posts list and no query", () => {
    render(<SearchComponent posts={[]} />);
    expect(screen.queryByText("React Basics")).not.toBeInTheDocument();
  });
});

describe("SearchSuggestions", () => {
  it("renders nothing for a blank query", () => {
    const { container } = render(
      <SearchSuggestions
        query=""
        posts={posts}
        onSuggestionClick={jest.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when there are no matching tags or speakers", () => {
    const { container } = render(
      <SearchSuggestions
        query="zzz"
        posts={posts}
        onSuggestionClick={jest.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("suggests matching tags and speakers, and invokes the callback on click", async () => {
    const onSuggestionClick = jest.fn();
    render(
      <SearchSuggestions
        query="ja"
        posts={posts}
        onSuggestionClick={onSuggestionClick}
      />,
    );
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Jane Doe"));
    expect(onSuggestionClick).toHaveBeenCalledWith("Jane Doe");
  });

  it("suggests matching tags", async () => {
    const onSuggestionClick = jest.fn();
    render(
      <SearchSuggestions
        query="rea"
        posts={posts}
        onSuggestionClick={onSuggestionClick}
      />,
    );
    await userEvent.click(screen.getByText("react"));
    expect(onSuggestionClick).toHaveBeenCalledWith("react");
  });
});

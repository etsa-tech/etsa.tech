/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AttendancePostPicker from "@/components/admin/AttendancePostPicker";

const posts = [
  { slug: "a", title: "Alpha Talk", date: "2025-01-01" },
  { slug: "b", title: "Beta Talk", date: "2025-02-01" },
];

describe("AttendancePostPicker", () => {
  it("shows the selected post's title when a value is set", () => {
    render(
      <AttendancePostPicker posts={posts} value="a" onSelect={jest.fn()} />,
    );
    expect(screen.getByDisplayValue("Alpha Talk")).toBeInTheDocument();
  });

  it("opens a filtered list on focus and calls onSelect on click", async () => {
    const onSelect = jest.fn();
    render(<AttendancePostPicker posts={posts} value="" onSelect={onSelect} />);

    const input = screen.getByPlaceholderText("Search posts by title...");
    await userEvent.click(input);
    await userEvent.type(input, "Beta");

    const option = await screen.findByRole("button", { name: /Beta Talk/ });
    await userEvent.click(option);

    expect(onSelect).toHaveBeenCalledWith(posts[1]);
  });

  it("shows a no-match message when nothing filters in", async () => {
    render(
      <AttendancePostPicker posts={posts} value="" onSelect={jest.fn()} />,
    );
    const input = screen.getByPlaceholderText("Search posts by title...");
    await userEvent.click(input);
    await userEvent.type(input, "nonexistent");
    expect(await screen.findByText("No matching posts")).toBeInTheDocument();
  });
});

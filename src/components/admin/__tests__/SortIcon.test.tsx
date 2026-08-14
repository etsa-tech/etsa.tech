/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { SortIcon } from "@/components/admin/SortIcon";

describe("SortIcon", () => {
  it("shows a neutral icon when the field isn't the active sort", () => {
    render(<SortIcon field="a" currentSortField="b" sortDirection="asc" />);
    expect(screen.getByText("↕️")).toBeInTheDocument();
  });

  it("shows an up arrow for the active field sorted ascending", () => {
    render(<SortIcon field="a" currentSortField="a" sortDirection="asc" />);
    expect(screen.getByText("↑")).toBeInTheDocument();
  });

  it("shows a down arrow for the active field sorted descending", () => {
    render(<SortIcon field="a" currentSortField="a" sortDirection="desc" />);
    expect(screen.getByText("↓")).toBeInTheDocument();
  });
});

/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import NotFound from "@/app/not-found";

describe("NotFound", () => {
  it("renders a 404 message with navigation links", () => {
    render(<NotFound />);
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go Home" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(
      screen.getByRole("link", { name: "Browse Presentations" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Read Blog" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Contact Us" }),
    ).toBeInTheDocument();
  });
});

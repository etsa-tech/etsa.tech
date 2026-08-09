/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import AboutPage from "@/app/about/page";

describe("AboutPage", () => {
  it("renders the main sections", () => {
    render(<AboutPage />);
    expect(
      screen.getByRole("heading", { name: "About ETSA" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Our Mission")).toBeInTheDocument();
    expect(screen.getByText("Our History")).toBeInTheDocument();
    expect(screen.getByText("Our Values")).toBeInTheDocument();
    expect(screen.getByText("Community Leadership")).toBeInTheDocument();
    expect(screen.getByText("Join Our Community")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Join Our Meetup" }),
    ).toHaveAttribute("href", "https://www.meetup.com/lopsa-etenn/");
  });
});

/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Header } from "@/components/Header";

jest.mock("@/components/ThemeToggle", () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

describe("Header", () => {
  it("renders top-level nav links", () => {
    render(<Header />);
    expect(
      screen.getAllByRole("link", { name: "Home" }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("link", { name: "Blog" }).length,
    ).toBeGreaterThan(0);
  });

  it("mobile menu is closed by default and opens on toggle click", async () => {
    render(<Header />);
    expect(document.getElementById("mobile-menu")).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Open main menu" }),
    );
    expect(document.getElementById("mobile-menu")).toBeInTheDocument();
  });

  it("closes the mobile menu after clicking a nav link within it", async () => {
    render(<Header />);
    await userEvent.click(
      screen.getByRole("button", { name: "Open main menu" }),
    );
    const mobileMenu = document.getElementById("mobile-menu")!;
    const aboutLinks = screen.getAllByRole("link", { name: "About" });
    const mobileAboutLink = aboutLinks.find((l) => mobileMenu.contains(l))!;
    await userEvent.click(mobileAboutLink);
    expect(document.getElementById("mobile-menu")).not.toBeInTheDocument();
  });
});

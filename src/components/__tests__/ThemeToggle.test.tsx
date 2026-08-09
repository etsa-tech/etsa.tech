/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "@/components/ThemeProvider";

jest.mock("@/components/ThemeProvider", () => ({
  useTheme: jest.fn(),
}));

const mockedUseTheme = jest.mocked(useTheme);

describe("ThemeToggle", () => {
  it("renders a placeholder before mount, then the real button after", async () => {
    mockedUseTheme.mockReturnValue({ theme: "light", setTheme: jest.fn() });
    render(<ThemeToggle />);
    expect(
      await screen.findByRole("button", { name: "Toggle theme" }),
    ).toBeInTheDocument();
  });

  it("toggles from light to dark on click", async () => {
    const setTheme = jest.fn();
    mockedUseTheme.mockReturnValue({ theme: "light", setTheme });
    render(<ThemeToggle />);
    const button = await screen.findByRole("button", { name: "Toggle theme" });
    await userEvent.click(button);
    expect(setTheme).toHaveBeenCalledWith("dark");
  });

  it("toggles from dark to light on click", async () => {
    const setTheme = jest.fn();
    mockedUseTheme.mockReturnValue({ theme: "dark", setTheme });
    render(<ThemeToggle />);
    const button = await screen.findByRole("button", { name: "Toggle theme" });
    await userEvent.click(button);
    expect(setTheme).toHaveBeenCalledWith("light");
  });
});

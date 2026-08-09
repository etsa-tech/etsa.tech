/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, useTheme } from "@/components/ThemeProvider";

function Consumer() {
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
        toggle
      </button>
    </div>
  );
}

function setMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })),
  });
}

beforeEach(() => {
  window.localStorage.clear();
  setMatchMedia(false);
});

describe("ThemeProvider / useTheme", () => {
  it("falls back to the default context value outside a provider", async () => {
    // createContext's default value is initialState (theme: "light"), not
    // undefined, so useTheme's `context === undefined` guard never actually
    // fires here - it silently returns the default instead of throwing.
    render(<Consumer />);
    expect(screen.getByTestId("theme")).toHaveTextContent("light");

    // The default context's setTheme is a no-op (`() => null`); clicking
    // still invokes it, which exercises that no-op for coverage.
    await userEvent.click(screen.getByText("toggle"));
    expect(screen.getByTestId("theme")).toHaveTextContent("light");
  });

  it("uses the system theme when nothing is stored", async () => {
    setMatchMedia(true); // system prefers dark
    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("theme")).toHaveTextContent("dark"),
    );
  });

  it("uses a stored theme preference over the system theme", async () => {
    window.localStorage.setItem("etsa-ui-theme", "dark");
    setMatchMedia(false);
    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("theme")).toHaveTextContent("dark"),
    );
  });

  it("first toggle stores an explicit preference; second toggle reverts to system", async () => {
    setMatchMedia(false); // system = light
    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("theme")).toHaveTextContent("light"),
    );

    await userEvent.click(screen.getByText("toggle"));
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(window.localStorage.getItem("etsa-ui-theme")).toBe("dark");

    await userEvent.click(screen.getByText("toggle"));
    expect(window.localStorage.getItem("etsa-ui-theme")).toBeNull();
  });

  it("second toggle reverts to a system preference that turned dark since mount", async () => {
    setMatchMedia(false); // system = light at mount
    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("theme")).toHaveTextContent("light"),
    );

    await userEvent.click(screen.getByText("toggle"));
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");

    // System preference flips to dark before the user reverts.
    setMatchMedia(true);
    await userEvent.click(screen.getByText("toggle"));
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(window.localStorage.getItem("etsa-ui-theme")).toBeNull();
  });

  it("applies the theme class to the document root", async () => {
    setMatchMedia(true);
    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    );
    await waitFor(() =>
      expect(document.documentElement.classList.contains("dark")).toBe(true),
    );
  });
});

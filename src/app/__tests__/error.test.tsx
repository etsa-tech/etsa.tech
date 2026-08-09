/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorPage from "@/app/error";

const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv };
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  process.env = originalEnv;
  jest.restoreAllMocks();
});

describe("ErrorPage", () => {
  it("renders a 500 message and calls reset on click", async () => {
    const reset = jest.fn();
    render(<ErrorPage error={new Error("boom")} reset={reset} />);
    expect(screen.getByText("500")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try Again" }));
    expect(reset).toHaveBeenCalled();
  });

  it("logs to the console in development", () => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "development",
      configurable: true,
    });
    render(<ErrorPage error={new Error("boom")} reset={jest.fn()} />);
    expect(console.error).toHaveBeenCalledWith("Error:", "boom");
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "test",
      configurable: true,
    });
  });

  it("does not log to the client console outside development", () => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "production",
      configurable: true,
    });
    render(<ErrorPage error={new Error("boom")} reset={jest.fn()} />);
    expect(console.error).not.toHaveBeenCalled();
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "test",
      configurable: true,
    });
  });
});

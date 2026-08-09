/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { AuthProvider } from "@/components/AuthProvider";

jest.mock("next-auth/react", () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="session-provider">{children}</div>
  ),
}));

describe("AuthProvider", () => {
  it("wraps children in a SessionProvider", () => {
    render(
      <AuthProvider>
        <span>child</span>
      </AuthProvider>,
    );
    expect(screen.getByTestId("session-provider")).toContainElement(
      screen.getByText("child"),
    );
  });
});

/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import AdminSignIn from "@/components/admin/AdminSignIn";

jest.mock("next-auth/react", () => ({ signIn: jest.fn() }));
jest.mock("next/navigation", () => ({ useSearchParams: jest.fn() }));

const mockedSignIn = jest.mocked(signIn);
const mockedUseSearchParams = jest.mocked(useSearchParams);

afterEach(() => jest.clearAllMocks());

describe("AdminSignIn", () => {
  it("renders the sign-in button with no error banner by default", () => {
    mockedUseSearchParams.mockReturnValue(new URLSearchParams() as never);
    render(<AdminSignIn />);
    expect(
      screen.getByRole("button", { name: /Sign in with Google/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Access Denied")).not.toBeInTheDocument();
  });

  it("shows the access-denied banner when the error param is set", () => {
    mockedUseSearchParams.mockReturnValue(
      new URLSearchParams("error=AccessDenied") as never,
    );
    render(<AdminSignIn />);
    expect(screen.getByText("Access Denied")).toBeInTheDocument();
  });

  it("calls signIn with Google on click and shows a loading state", async () => {
    mockedUseSearchParams.mockReturnValue(new URLSearchParams() as never);
    let resolveSignIn: () => void = () => {};
    mockedSignIn.mockImplementation(
      () =>
        new Promise(
          (resolve) => (resolveSignIn = () => resolve(undefined as never)),
        ),
    );
    render(<AdminSignIn />);
    await userEvent.click(
      screen.getByRole("button", { name: /Sign in with Google/ }),
    );
    expect(mockedSignIn).toHaveBeenCalledWith("google", {
      callbackUrl: "/admin",
    });
    expect(screen.getByText("Signing in...")).toBeInTheDocument();
    resolveSignIn();
  });

  it("resets the loading state when signIn throws", async () => {
    mockedUseSearchParams.mockReturnValue(new URLSearchParams() as never);
    mockedSignIn.mockRejectedValue(new Error("oauth error"));
    jest.spyOn(console, "error").mockImplementation(() => {});
    render(<AdminSignIn />);
    await userEvent.click(
      screen.getByRole("button", { name: /Sign in with Google/ }),
    );
    expect(
      await screen.findByRole("button", { name: /Sign in with Google/ }),
    ).toBeInTheDocument();
  });
});

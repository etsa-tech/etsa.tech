/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import AdminNavigation from "@/components/admin/AdminNavigation";

jest.mock("next-auth/react", () => ({ signOut: jest.fn() }));
jest.mock("next/navigation", () => ({ usePathname: jest.fn() }));

const mockedSignOut = jest.mocked(signOut);
const mockedUsePathname = jest.mocked(usePathname);

beforeEach(() => {
  mockedUsePathname.mockReturnValue("/admin");
  window.localStorage.clear();
});

afterEach(() => jest.clearAllMocks());

describe("AdminNavigation", () => {
  it("renders the user's name and email", () => {
    render(
      <AdminNavigation user={{ name: "Jane Doe", email: "jane@etsa.tech" }} />,
    );
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("jane@etsa.tech")).toBeInTheDocument();
  });

  it("shows an initial-letter avatar fallback when there's no image", () => {
    render(
      <AdminNavigation user={{ name: "Jane Doe", email: "jane@etsa.tech" }} />,
    );
    expect(screen.getByText("J")).toBeInTheDocument();
  });

  it("renders an Image avatar when the user has an image", () => {
    render(
      <AdminNavigation
        user={{ name: "Jane Doe", email: "jane@etsa.tech", image: "/jane.jpg" }}
      />,
    );
    const avatar = screen.getByAltText("Jane Doe");
    expect(avatar.tagName).toBe("IMG");
  });

  it("falls back to 'User' alt text on the image avatar when there's no name", () => {
    render(<AdminNavigation user={{ image: "/jane.jpg" }} />);
    expect(screen.getByAltText("User")).toBeInTheDocument();
  });

  it("falls back to 'U' when there's no user at all", () => {
    render(<AdminNavigation user={undefined} />);
    expect(screen.getByText("U")).toBeInTheDocument();
  });

  it("highlights the active nav link", () => {
    mockedUsePathname.mockReturnValue("/admin/posts");
    render(<AdminNavigation user={{ name: "Jane", email: "j@etsa.tech" }} />);
    const link = screen.getByRole("link", { name: /Blog Posts/ });
    expect(link.className).toContain("border-etsa-primary");
  });

  it("clears local admin state and signs out on click", async () => {
    window.localStorage.setItem("etsa-admin-branch", "feature/x");
    render(<AdminNavigation user={{ name: "Jane", email: "j@etsa.tech" }} />);
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(window.localStorage.getItem("etsa-admin-branch")).toBeNull();
    expect(window.localStorage.getItem("etsa-admin-logout")).toBeTruthy();
    expect(mockedSignOut).toHaveBeenCalledWith({ callbackUrl: "/" });
  });
});

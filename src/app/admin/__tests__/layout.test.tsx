/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { useSession } from "next-auth/react";
import AdminLayout from "@/app/admin/layout";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@/components/admin/AdminNavigation", () => ({
  __esModule: true,
  default: ({ user }: { user: { name?: string } }) => (
    <div data-testid="admin-nav">{user?.name}</div>
  ),
}));
jest.mock("@/components/admin/AdminSignIn", () => ({
  __esModule: true,
  default: () => <div data-testid="admin-signin" />,
}));

const mockedUseSession = jest.mocked(useSession);

afterEach(() => jest.clearAllMocks());

describe("AdminLayout", () => {
  it("shows a loading state while the session is loading", () => {
    mockedUseSession.mockReturnValue({
      data: null,
      status: "loading",
    } as never);
    render(
      <AdminLayout>
        <div>content</div>
      </AdminLayout>,
    );
    expect(screen.getByText("Loading admin interface...")).toBeInTheDocument();
  });

  it("shows the sign-in screen when unauthenticated", () => {
    mockedUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
    } as never);
    render(
      <AdminLayout>
        <div>content</div>
      </AdminLayout>,
    );
    expect(screen.getByTestId("admin-signin")).toBeInTheDocument();
  });

  it("renders the admin nav and children when authenticated", () => {
    mockedUseSession.mockReturnValue({
      data: { user: { name: "Jane", email: "jane@etsa.tech" } },
      status: "authenticated",
    } as never);
    render(
      <AdminLayout>
        <div>page content</div>
      </AdminLayout>,
    );
    expect(screen.getByTestId("admin-nav")).toHaveTextContent("Jane");
    expect(screen.getByText("page content")).toBeInTheDocument();
  });
});

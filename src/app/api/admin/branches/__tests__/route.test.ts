import { getServerSession } from "next-auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import { getBranches } from "@/lib/github";
import { GET } from "../route";

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth", () => ({ authOptions: {} }));
jest.mock("@/lib/auth-utils", () => ({ isAuthorizedUser: jest.fn() }));
jest.mock("@/lib/github", () => ({ getBranches: jest.fn() }));

const mockedGetServerSession = jest.mocked(getServerSession);
const mockedIsAuthorizedUser = jest.mocked(isAuthorizedUser);
const mockedGetBranches = jest.mocked(getBranches);

beforeEach(() => {
  mockedGetServerSession.mockResolvedValue({
    user: { email: "a@etsa.tech" },
  } as never);
  mockedIsAuthorizedUser.mockReturnValue(true);
});

afterEach(() => jest.clearAllMocks());

describe("GET /api/admin/branches", () => {
  it("returns branches for an authorized user", async () => {
    mockedGetBranches.mockResolvedValue(["main", "dev"]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).branches).toEqual(["main", "dev"]);
  });

  it("401s for an unauthorized user", async () => {
    mockedIsAuthorizedUser.mockReturnValue(false);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(mockedGetBranches).not.toHaveBeenCalled();
  });

  it("500s when getBranches throws", async () => {
    mockedGetBranches.mockRejectedValue(new Error("down"));
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

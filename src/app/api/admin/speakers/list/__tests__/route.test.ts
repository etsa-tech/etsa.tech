import fs from "fs";
import { getServerSession } from "next-auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import { GET } from "../route";

jest.mock("fs");
jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth", () => ({ authOptions: {} }));
jest.mock("@/lib/auth-utils", () => ({ isAuthorizedUser: jest.fn() }));

const mockedFs = jest.mocked(fs);
const mockedGetServerSession = jest.mocked(getServerSession);
const mockedIsAuthorizedUser = jest.mocked(isAuthorizedUser);

beforeEach(() => {
  mockedGetServerSession.mockResolvedValue({
    user: { email: "a@etsa.tech" },
  } as never);
  mockedIsAuthorizedUser.mockReturnValue(true);
});

afterEach(() => jest.resetAllMocks());

describe("GET /api/admin/speakers/list", () => {
  it("returns an empty list with a message when the directory doesn't exist", async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { email: "a@etsa.tech" },
    } as never);
    mockedIsAuthorizedUser.mockReturnValue(true);
    mockedFs.existsSync.mockReturnValue(false);

    const res = await GET();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.images).toEqual([]);
    expect(body.message).toMatch(/doesn't exist yet/);
  });

  it("lists and sorts image files, filtering out non-images", async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { email: "a@etsa.tech" },
    } as never);
    mockedIsAuthorizedUser.mockReturnValue(true);
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readdirSync.mockReturnValue([
      "b.png",
      "a.jpg",
      "notes.txt",
    ] as never);
    mockedFs.statSync.mockReturnValue({
      size: 100,
      mtime: new Date("2026-01-01T00:00:00Z"),
    } as never);

    const res = await GET();
    const body = await res.json();
    expect(body.count).toBe(2);
    expect(body.images.map((i: { name: string }) => i.name)).toEqual([
      "a.jpg",
      "b.png",
    ]);
  });

  it("returns an empty list with an error when reading the directory throws", async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { email: "a@etsa.tech" },
    } as never);
    mockedIsAuthorizedUser.mockReturnValue(true);
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readdirSync.mockImplementation(() => {
      throw new Error("EACCES");
    });

    const res = await GET();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.images).toEqual([]);
    expect(body.error).toBeDefined();
  });

  it("401s for an unauthorized user", async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { email: "a@etsa.tech" },
    } as never);
    mockedIsAuthorizedUser.mockReturnValue(false);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("500s when getServerSession itself throws", async () => {
    mockedGetServerSession.mockRejectedValue(new Error("session down"));
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

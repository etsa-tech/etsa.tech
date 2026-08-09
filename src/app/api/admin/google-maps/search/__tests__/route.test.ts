import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import { GET } from "../route";

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth", () => ({ authOptions: {} }));
jest.mock("@/lib/auth-utils", () => ({ isAuthorizedUser: jest.fn() }));

const mockedGetServerSession = jest.mocked(getServerSession);
const mockedIsAuthorizedUser = jest.mocked(isAuthorizedUser);
const originalEnv = process.env;
const originalFetch = global.fetch;

function req(query: string) {
  return new NextRequest(`http://localhost/x${query}`);
}

beforeEach(() => {
  process.env = { ...originalEnv, GOOGLE_MAPS_API_KEY_GEOCODING: "test-key" };
  mockedGetServerSession.mockResolvedValue({
    user: { email: "a@etsa.tech" },
  } as never);
  mockedIsAuthorizedUser.mockReturnValue(true);
});

afterEach(() => {
  process.env = originalEnv;
  global.fetch = originalFetch;
  jest.clearAllMocks();
});

function geocodeResult(overrides: Record<string, unknown> = {}) {
  return {
    status: "OK",
    results: [
      {
        formatted_address: "123 Main St, Anytown",
        geometry: { location: { lat: 1.23, lng: 4.56 } },
        address_components: [],
        ...overrides,
      },
    ],
  };
}

describe("GET /api/admin/google-maps/search", () => {
  it("returns the result's business name when present", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => geocodeResult({ name: "Acme HQ" }),
    }) as unknown as typeof fetch;
    const res = await GET(req("?query=Acme"));
    const body = await res.json();
    expect(body.name).toBe("Acme HQ");
    expect(body.lat).toBe("1.23");
  });

  it("falls back to an establishment address component", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () =>
        geocodeResult({
          address_components: [
            {
              long_name: "Acme Building",
              short_name: "Acme",
              types: ["establishment"],
            },
          ],
        }),
    }) as unknown as typeof fetch;
    const res = await GET(req("?query=Acme"));
    expect((await res.json()).name).toBe("Acme Building");
  });

  it("falls back to the first formatted_address segment when it's not a street number", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () =>
        geocodeResult({ formatted_address: "Downtown Plaza, Anytown" }),
    }) as unknown as typeof fetch;
    const res = await GET(req("?query=Acme"));
    expect((await res.json()).name).toBe("Downtown Plaza");
  });

  it("keeps the original query as the name when the first address segment looks like a street number", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => geocodeResult(),
    }) as unknown as typeof fetch;
    const res = await GET(req("?query=Acme"));
    expect((await res.json()).name).toBe("Acme");
  });

  it("400s when query is missing", async () => {
    const res = await GET(req(""));
    expect(res.status).toBe(400);
  });

  it("500s when the API key isn't configured", async () => {
    process.env.GOOGLE_MAPS_API_KEY_GEOCODING = undefined;
    const res = await GET(req("?query=Acme"));
    expect(res.status).toBe(500);
  });

  it("404s when no results are found", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ZERO_RESULTS", results: [] }),
    }) as unknown as typeof fetch;
    const res = await GET(req("?query=Nowhere"));
    expect(res.status).toBe(404);
  });

  it("500s when the upstream HTTP call fails", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 500, statusText: "Error" });
    const res = await GET(req("?query=Acme"));
    expect(res.status).toBe(500);
  });

  it("401s for an unauthorized user", async () => {
    mockedIsAuthorizedUser.mockReturnValue(false);
    const res = await GET(req("?query=Acme"));
    expect(res.status).toBe(401);
  });
});

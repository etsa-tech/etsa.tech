import { signState, verifyState } from "@/lib/linkedin/state";

const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv, NEXTAUTH_SECRET: "test-secret" };
});

afterEach(() => {
  process.env = originalEnv;
});

describe("linkedin state", () => {
  it("round-trips a post state", () => {
    const token = signState({ purpose: "post", slug: "my-talk" });
    expect(verifyState(token)).toEqual({ purpose: "post", slug: "my-talk" });
  });

  it("round-trips a speaker-connect state", () => {
    const token = signState({
      purpose: "speaker-connect",
      slug: "my-talk",
      speakerName: "Jane Doe",
    });
    expect(verifyState(token)).toEqual({
      purpose: "speaker-connect",
      slug: "my-talk",
      speakerName: "Jane Doe",
    });
  });

  it("throws when NEXTAUTH_SECRET is not configured", () => {
    delete process.env.NEXTAUTH_SECRET;
    expect(() => signState({ purpose: "post", slug: "p" })).toThrow(
      "NEXTAUTH_SECRET is not configured",
    );
  });

  it("rejects a malformed token with no signature segment", () => {
    expect(verifyState("not-a-valid-token")).toBeNull();
  });

  it("rejects a tampered signature", () => {
    const token = signState({ purpose: "post", slug: "my-talk" });
    const [encoded] = token.split(".");
    expect(verifyState(`${encoded}.tampered-signature`)).toBeNull();
  });

  it("rejects a signature of mismatched length", () => {
    const token = signState({ purpose: "post", slug: "my-talk" });
    const [encoded] = token.split(".");
    expect(verifyState(`${encoded}.short`)).toBeNull();
  });

  it("rejects an expired token", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const token = signState({ purpose: "post", slug: "my-talk" });
    jest.setSystemTime(new Date("2026-01-01T00:11:00.000Z"));
    expect(verifyState(token)).toBeNull();
    jest.useRealTimers();
  });

  it("rejects a token whose payload isn't valid JSON", () => {
    const encoded = Buffer.from("not json").toString("base64url");
    const secret = "test-secret";
    const { createHmac } = jest.requireActual("node:crypto");
    const signature = createHmac("sha256", secret)
      .update(encoded)
      .digest("base64url");
    expect(verifyState(`${encoded}.${signature}`)).toBeNull();
  });
});

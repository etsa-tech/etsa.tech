import crypto from "crypto";
import { NextRequest } from "next/server";
import { POST } from "../route";

const originalEnv = process.env;
const SECRET = "test-webhook-secret";

function signedReq(
  payload: object,
  {
    secret = SECRET,
    eventType = "push",
    userAgent = "GitHub-Hookshot/abc123",
    contentType = "application/json",
    signature,
  }: {
    secret?: string;
    eventType?: string | null;
    userAgent?: string | null;
    contentType?: string | null;
    signature?: string;
  } = {},
) {
  const body = JSON.stringify(payload);
  const sig =
    signature ??
    `sha256=${crypto
      .createHmac("sha256", secret)
      .update(body, "utf8")
      .digest("hex")}`;

  const headers: Record<string, string> = {};
  if (userAgent) headers["user-agent"] = userAgent;
  if (eventType) headers["x-github-event"] = eventType;
  if (contentType) headers["content-type"] = contentType;
  headers["x-hub-signature-256"] = sig;

  return new NextRequest("http://localhost/api/webhooks/github", {
    method: "POST",
    headers,
    body,
  });
}

beforeEach(() => {
  process.env = { ...originalEnv, GITHUB_WEBHOOK_SECRET: SECRET };
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  process.env = originalEnv;
  jest.restoreAllMocks();
});

describe("POST /api/webhooks/github", () => {
  it("processes a valid push event", async () => {
    const res = await POST(
      signedReq({
        ref: "refs/heads/main",
        commits: [{}],
        repository: { name: "etsa.tech" },
      }),
    );
    expect(res.status).toBe(200);
  });

  it("processes a push event with no commits or repository info", async () => {
    const res = await POST(signedReq({ ref: "refs/heads/main" }));
    expect(res.status).toBe(200);
  });

  it("processes a pull_request event", async () => {
    const res = await POST(
      signedReq(
        { action: "opened", pull_request: { number: 1, title: "x" } },
        { eventType: "pull_request" },
      ),
    );
    expect(res.status).toBe(200);
  });

  it("processes an installation event", async () => {
    const res = await POST(
      signedReq(
        { action: "created", installation: { id: 1 } },
        { eventType: "installation" },
      ),
    );
    expect(res.status).toBe(200);
  });

  it("logs and succeeds for an unhandled event type", async () => {
    const res = await POST(signedReq({}, { eventType: "star" }));
    expect(res.status).toBe(200);
  });

  it("500s when the webhook secret isn't configured", async () => {
    process.env.GITHUB_WEBHOOK_SECRET = undefined;
    const res = await POST(signedReq({}));
    expect(res.status).toBe(500);
  });

  it("401s for a non-GitHub user agent", async () => {
    const res = await POST(signedReq({}, { userAgent: "curl/8.0" }));
    expect(res.status).toBe(401);
  });

  it("401s when no signature header is present", async () => {
    const req = signedReq({});
    req.headers.delete("x-hub-signature-256");
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("400s for a non-JSON content type", async () => {
    const res = await POST(signedReq({}, { contentType: "text/plain" }));
    expect(res.status).toBe(400);
  });

  it("401s for a well-formed but incorrect signature", async () => {
    // timingSafeEqual throws on a length mismatch (caught -> 500), so this
    // needs a same-length wrong digest to actually exercise the 401 branch.
    const wrongDigest = "0".repeat(64);
    const res = await POST(
      signedReq({}, { signature: `sha256=${wrongDigest}` }),
    );
    expect(res.status).toBe(401);
  });

  it("500s when the signature has a different length than expected", async () => {
    const res = await POST(signedReq({}, { signature: "sha256=deadbeef" }));
    expect(res.status).toBe(500);
  });

  it("500s when the payload isn't valid JSON despite a valid signature", async () => {
    const body = "not-json";
    const sig = `sha256=${crypto
      .createHmac("sha256", SECRET)
      .update(body, "utf8")
      .digest("hex")}`;
    const req = new NextRequest("http://localhost/api/webhooks/github", {
      method: "POST",
      headers: {
        "user-agent": "GitHub-Hookshot/abc",
        "x-github-event": "push",
        "content-type": "application/json",
        "x-hub-signature-256": sig,
      },
      body,
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});

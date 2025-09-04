import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// Verify GitHub webhook signature
function verifySignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload, "utf8")
    .digest("hex");

  const expectedSignatureWithPrefix = `sha256=${expectedSignature}`;

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignatureWithPrefix),
  );
}

export async function POST(request: NextRequest) {
  try {
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("GITHUB_WEBHOOK_SECRET not configured");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 },
      );
    }

    // Verify User-Agent is from GitHub
    const userAgent = request.headers.get("user-agent");
    if (!userAgent?.startsWith("GitHub-Hookshot/")) {
      return NextResponse.json(
        { error: "Invalid user agent" },
        { status: 401 },
      );
    }

    // Get the signature from headers
    const signature = request.headers.get("x-hub-signature-256");
    if (!signature) {
      return NextResponse.json(
        { error: "No signature provided" },
        { status: 401 },
      );
    }

    // Verify content type
    const contentType = request.headers.get("content-type");
    if (contentType !== "application/json") {
      return NextResponse.json(
        { error: "Invalid content type" },
        { status: 400 },
      );
    }

    // Get the raw payload
    const payload = await request.text();

    // Verify the signature
    if (!verifySignature(payload, signature, webhookSecret)) {
      console.error("Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Parse the payload
    const event = JSON.parse(payload);
    const eventType = request.headers.get("x-github-event");

    console.log(`Received GitHub webhook: ${eventType}`);

    // Handle different webhook events
    switch (eventType) {
      case "push":
        await handlePushEvent(event);
        break;

      case "pull_request":
        await handlePullRequestEvent(event);
        break;

      case "installation":
        await handleInstallationEvent(event);
        break;

      default:
        console.log(`Unhandled webhook event: ${eventType}`);
    }

    return NextResponse.json({ message: "Webhook processed successfully" });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}

interface GitHubPushEvent {
  ref: string;
  commits?: Array<unknown>;
  repository?: { name: string };
}

interface GitHubPullRequestEvent {
  action: string;
  pull_request?: {
    number: number;
    title: string;
  };
}

interface GitHubInstallationEvent {
  action: string;
  installation?: {
    id: number;
  };
}

async function handlePushEvent(event: GitHubPushEvent) {
  // Handle push events (e.g., blog post updates)
  console.log("Push event:", {
    ref: event.ref,
    commits: event.commits?.length || 0,
    repository: event.repository?.name,
  });

  // Example: Trigger site rebuild, update cache, etc.
}

async function handlePullRequestEvent(event: GitHubPullRequestEvent) {
  // Handle PR events (e.g., blog post reviews)
  console.log("Pull request event:", {
    action: event.action,
    number: event.pull_request?.number,
    title: event.pull_request?.title,
  });

  // Example: Send notifications, update status, etc.
}

async function handleInstallationEvent(event: GitHubInstallationEvent) {
  // Handle app installation events
  console.log("Installation event:", {
    action: event.action,
    installation_id: event.installation?.id,
  });

  // Example: Store installation ID, setup permissions, etc.
}

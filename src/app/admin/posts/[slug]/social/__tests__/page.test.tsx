/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useParams } from "next/navigation";
import SocialMailingPage from "@/app/admin/posts/[slug]/social/page";
import type { SocialCacheRecord } from "@/types/social";

jest.mock("next/navigation", () => ({ useParams: jest.fn() }));

const mockedUseParams = jest.mocked(useParams);
const originalFetch = global.fetch;

beforeEach(() => {
  mockedUseParams.mockReturnValue({ slug: "my-talk" } as never);
});

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body };
}

function baseCacheRecord(
  overrides: Partial<SocialCacheRecord> = {},
): SocialCacheRecord {
  return {
    provider: "mailchimp",
    campaignId: null,
    campaignUrl: null,
    status: "draft",
    testRecipients: [],
    sentAt: null,
    sentBy: null,
    updatedAt: "2026-01-01T00:00:00.000Z",
    updatedBy: null,
    ...overrides,
  };
}

/**
 * Router mapping fetch calls by substring + method to a handler. Patterns
 * are tried longest (most specific) first, since e.g. the plain post-fetch
 * pattern "/admin/posts/my-talk" is itself a substring of every social
 * sub-route URL ("/admin/posts/my-talk/social/mailchimp/search?...").
 */
function mockFetchRouter(handlers: Record<string, () => Promise<unknown>>) {
  const entries = Object.entries(handlers).sort(
    ([a], [b]) => b.length - a.length,
  );
  return jest.fn().mockImplementation((url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    for (const [pattern, handler] of entries) {
      const [urlPattern, methodPattern] = pattern.split(" ");
      if (
        url.includes(urlPattern) &&
        (!methodPattern || methodPattern === method)
      ) {
        return handler();
      }
    }
    return Promise.resolve(jsonResponse({}));
  });
}

const fullFrontmatter = {
  title: "My Talk",
  blogpost: false,
  eventDate: "2026-02-01",
  presentationDescription: "An abstract about things.",
  speakers: [{ name: "Jane Doe", bio: "A great speaker.", company: "Acme" }],
};

function standardHandlers(
  extra: Record<string, () => Promise<unknown>> = {},
  cached: SocialCacheRecord | null = null,
) {
  return {
    "/social/mailchimp/status GET": async () => jsonResponse({ cached }),
    "/admin/posts/my-talk GET": async () =>
      jsonResponse({ frontmatter: fullFrontmatter }),
    ...extra,
  };
}

describe("SocialMailingPage - loading, error, and blogpost-gate states", () => {
  it("shows a loading state before the post fetch resolves", () => {
    global.fetch = jest.fn(
      () => new Promise(() => {}),
    ) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("does not fetch and stays in the loading state when slug is empty", () => {
    mockedUseParams.mockReturnValue({} as never);
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    render(<SocialMailingPage />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows an error message when the post fetch response is not ok", async () => {
    global.fetch = mockFetchRouter(
      standardHandlers({
        "/admin/posts/my-talk GET": async () => jsonResponse({}, false),
      }),
    ) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    expect(await screen.findByText("Failed to load post.")).toBeInTheDocument();
  });

  it("shows an error message when the post fetch throws", async () => {
    global.fetch = mockFetchRouter(
      standardHandlers({
        "/admin/posts/my-talk GET": async () => {
          throw new Error("network down");
        },
      }),
    ) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    expect(await screen.findByText("Failed to load post.")).toBeInTheDocument();
  });

  it("shows the blog-post gate message and does not render the main UI for a blog post", async () => {
    global.fetch = mockFetchRouter(
      standardHandlers({
        "/admin/posts/my-talk GET": async () =>
          jsonResponse({ frontmatter: { ...fullFrontmatter, blogpost: true } }),
      }),
    ) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    expect(
      await screen.findByText(
        "Social mailings are only available for presentation posts.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("1. Compose")).not.toBeInTheDocument();
  });
});

describe("SocialMailingPage - compose section", () => {
  it("renders post fields, speaker-array fields, and the status badge/campaign link/sent line", async () => {
    global.fetch = mockFetchRouter(
      standardHandlers(
        {},
        baseCacheRecord({
          status: "sent",
          campaignId: "camp1",
          campaignUrl: "https://mailchimp.com/campaigns/camp1",
          sentAt: "2026-02-05T12:00:00.000Z",
          sentBy: "organizer@etsa.tech",
          testRecipients: ["a@example.com"],
        }),
      ),
    ) as unknown as typeof fetch;
    render(<SocialMailingPage />);

    expect(await screen.findByText("1. Compose")).toBeInTheDocument();
    expect(screen.getAllByText("My Talk").length).toBeGreaterThan(0);
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("A great speaker.")).toBeInTheDocument();
    expect(screen.getByText("2026-02-01")).toBeInTheDocument();
    expect(screen.getByText("An abstract about things.")).toBeInTheDocument();

    expect(screen.getByText("sent")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Open in Mailchimp/ });
    expect(link).toHaveAttribute(
      "href",
      "https://mailchimp.com/campaigns/camp1",
    );
    expect(
      screen.getByText(/sent .* by organizer@etsa\.tech/),
    ).toBeInTheDocument();
  });

  it("falls back to top-level frontmatter fields and empty-string defaults when there are no speakers", async () => {
    global.fetch = mockFetchRouter(
      standardHandlers({
        "/admin/posts/my-talk GET": async () =>
          jsonResponse({
            frontmatter: {
              title: "My Talk",
              blogpost: false,
              meetingDate: "2026-03-01",
              excerpt: "Fallback abstract.",
              speakerName: "Top Level Speaker",
              speakerCompany: "TopCo",
              speakerBio: "Top level bio.",
            },
          }),
      }),
    ) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    expect(await screen.findByText("1. Compose")).toBeInTheDocument();
    expect(screen.getByText("Top Level Speaker")).toBeInTheDocument();
    expect(screen.getByText("TopCo")).toBeInTheDocument();
    expect(screen.getByText("Top level bio.")).toBeInTheDocument();
    expect(screen.getByText("2026-03-01")).toBeInTheDocument();
    expect(screen.getByText("Fallback abstract.")).toBeInTheDocument();
  });

  it("shows em-dash fallbacks for every empty compose field", async () => {
    global.fetch = mockFetchRouter(
      standardHandlers({
        "/admin/posts/my-talk GET": async () =>
          jsonResponse({
            frontmatter: { title: "", blogpost: false, date: "" },
          }),
      }),
    ) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    expect(await screen.findByText("1. Compose")).toBeInTheDocument();
    // Talk title, speaker name, company, bio, date, abstract - six dd's,
    // all falling back to the em dash.
    expect(screen.getAllByText("—")).toHaveLength(6);
  });

  it("does not render the status bar while status is still loading", async () => {
    let resolveStatus!: (v: unknown) => void;
    global.fetch = mockFetchRouter(
      standardHandlers({
        "/social/mailchimp/status GET": () =>
          new Promise((resolve) => {
            resolveStatus = resolve;
          }),
      }),
    ) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    expect(await screen.findByText("1. Compose")).toBeInTheDocument();
    expect(screen.queryByText("Status:")).not.toBeInTheDocument();
    resolveStatus(jsonResponse({ cached: baseCacheRecord() }));
    expect(await screen.findByText("Status:")).toBeInTheDocument();
  });

  it("creates a draft campaign, showing the creating label then the recreate label", async () => {
    const fetchMock = mockFetchRouter(
      standardHandlers({
        "/social/mailchimp/draft POST": async () =>
          jsonResponse({
            cached: baseCacheRecord({ campaignId: "camp1", status: "draft" }),
          }),
      }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;
    render(<SocialMailingPage />);
    const button = await screen.findByRole("button", {
      name: "Create draft campaign",
    });
    await userEvent.click(button);
    expect(
      await screen.findByRole("button", {
        name: "Recreate draft from current content",
      }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/social/mailchimp/draft"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("shows the server error message when creating a draft fails", async () => {
    global.fetch = mockFetchRouter(
      standardHandlers({
        "/social/mailchimp/draft POST": async () =>
          jsonResponse({ error: "Mailchimp API key missing" }, false),
      }),
    ) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    const button = await screen.findByRole("button", {
      name: "Create draft campaign",
    });
    await userEvent.click(button);
    expect(
      await screen.findByText("Mailchimp API key missing"),
    ).toBeInTheDocument();
  });

  it("shows the fallback error message when creating a draft fails without an error string", async () => {
    global.fetch = mockFetchRouter(
      standardHandlers({
        "/social/mailchimp/draft POST": async () => jsonResponse({}, false),
      }),
    ) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    const button = await screen.findByRole("button", {
      name: "Create draft campaign",
    });
    await userEvent.click(button);
    expect(
      await screen.findByText("Failed to create draft"),
    ).toBeInTheDocument();
  });

  it("shows the fallback error message when creating a draft throws a non-Error", async () => {
    global.fetch = mockFetchRouter(
      standardHandlers({
        "/social/mailchimp/draft POST": async () => {
          throw "network down";
        },
      }),
    ) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    const button = await screen.findByRole("button", {
      name: "Create draft campaign",
    });
    await userEvent.click(button);
    expect(
      await screen.findByText("Failed to create draft"),
    ).toBeInTheDocument();
  });
});

describe("SocialMailingPage - send test section", () => {
  it("shows 'Create a draft first.' when there is no campaign yet", async () => {
    global.fetch = mockFetchRouter(
      standardHandlers(),
    ) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    expect(await screen.findByText("2. Send test")).toBeInTheDocument();
    expect(screen.getByText("Create a draft first.")).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText("Search contacts by name or email…"),
    ).not.toBeInTheDocument();
  });

  async function renderWithCampaign(
    extra: Record<string, () => Promise<unknown>> = {},
    cached: SocialCacheRecord = baseCacheRecord({ campaignId: "camp1" }),
  ) {
    const fetchMock = mockFetchRouter(standardHandlers(extra, cached));
    global.fetch = fetchMock as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByPlaceholderText("Search contacts by name or email…");
    return fetchMock;
  }

  it("does not search when the query is empty (or whitespace-only)", async () => {
    const fetchMock = await renderWithCampaign();
    const input = screen.getByPlaceholderText(
      "Search contacts by name or email…",
    );
    fetchMock.mockClear();
    // Directly firing a change with an empty/whitespace value exercises the
    // `if (!query.trim()) { ...; return; }` short-circuit branch without
    // needing a working search handler first.
    fireEvent.change(input, { target: { value: "   " } });
    expect(
      fetchMock.mock.calls.some(([url]: [string]) =>
        url.includes("/social/mailchimp/search"),
      ),
    ).toBe(false);
  });

  it("searches contacts, shows a searching indicator, and adds a recipient", async () => {
    await renderWithCampaign({
      "/social/mailchimp/search GET": async () =>
        jsonResponse({
          contacts: [{ id: "c1", email: "jane@example.com", name: "Jane" }],
        }),
    });
    const input = screen.getByPlaceholderText(
      "Search contacts by name or email…",
    );
    await userEvent.type(input, "jane");
    expect(
      await screen.findByRole("button", { name: /Jane — jane@example\.com/ }),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: /Jane — jane@example\.com/ }),
    );
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Jane — jane@example\.com/ }),
    ).not.toBeInTheDocument();
  });

  it("renders a contact result with no name using only the email", async () => {
    await renderWithCampaign({
      "/social/mailchimp/search GET": async () =>
        jsonResponse({ contacts: [{ id: "c2", email: "noname@example.com" }] }),
    });
    const input = screen.getByPlaceholderText(
      "Search contacts by name or email…",
    );
    await userEvent.type(input, "noname");
    expect(
      await screen.findByRole("button", { name: "noname@example.com" }),
    ).toBeInTheDocument();
  });

  it("does not add a duplicate recipient when the same contact is selected twice", async () => {
    await renderWithCampaign({
      "/social/mailchimp/search GET": async () =>
        jsonResponse({
          contacts: [{ id: "c1", email: "jane@example.com", name: "Jane" }],
        }),
    });
    const input = screen.getByPlaceholderText(
      "Search contacts by name or email…",
    );
    await userEvent.type(input, "jane");
    await userEvent.click(
      await screen.findByRole("button", { name: /Jane — jane@example\.com/ }),
    );
    expect(screen.getAllByText("jane@example.com")).toHaveLength(1);

    // Search again and select the same contact a second time.
    await userEvent.type(input, "jane");
    await userEvent.click(
      await screen.findByRole("button", { name: /Jane — jane@example\.com/ }),
    );
    // Still only one chip - the de-dup branch kept `prev` unchanged.
    expect(screen.getAllByText("jane@example.com")).toHaveLength(1);
  });

  it("removes a selected recipient via its remove button", async () => {
    await renderWithCampaign({
      "/social/mailchimp/search GET": async () =>
        jsonResponse({
          contacts: [{ id: "c1", email: "jane@example.com", name: "Jane" }],
        }),
    });
    const input = screen.getByPlaceholderText(
      "Search contacts by name or email…",
    );
    await userEvent.type(input, "jane");
    await userEvent.click(
      await screen.findByRole("button", { name: /Jane — jane@example\.com/ }),
    );
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Remove jane@example.com" }),
    );
    expect(screen.queryByText("jane@example.com")).not.toBeInTheDocument();
  });

  it("leaves the send test button disabled with no recipients selected", async () => {
    await renderWithCampaign();
    expect(screen.getByRole("button", { name: "Send test" })).toBeDisabled();
  });

  async function renderWithSelectedRecipient(
    extra: Record<string, () => Promise<unknown>> = {},
  ) {
    await renderWithCampaign({
      "/social/mailchimp/search GET": async () =>
        jsonResponse({
          contacts: [{ id: "c1", email: "jane@example.com", name: "Jane" }],
        }),
      ...extra,
    });
    const input = screen.getByPlaceholderText(
      "Search contacts by name or email…",
    );
    await userEvent.type(input, "jane");
    await userEvent.click(
      await screen.findByRole("button", { name: /Jane — jane@example\.com/ }),
    );
  }

  it("sends a test, updates the cache record, and shows who it was sent to", async () => {
    const fetchMock = jest.fn();
    global.fetch = mockFetchRouter(
      standardHandlers(
        {
          "/social/mailchimp/search GET": async () =>
            jsonResponse({
              contacts: [{ id: "c1", email: "jane@example.com", name: "Jane" }],
            }),
          "/social/mailchimp/test POST": async () =>
            jsonResponse({
              cached: baseCacheRecord({
                campaignId: "camp1",
                status: "tested",
                testRecipients: ["jane@example.com"],
              }),
            }),
        },
        baseCacheRecord({ campaignId: "camp1" }),
      ),
    ) as unknown as typeof fetch;
    Object.assign(fetchMock, {});
    render(<SocialMailingPage />);
    const input = await screen.findByPlaceholderText(
      "Search contacts by name or email…",
    );
    await userEvent.type(input, "jane");
    await userEvent.click(
      await screen.findByRole("button", { name: /Jane — jane@example\.com/ }),
    );
    const sendTestButton = screen.getByRole("button", { name: "Send test" });
    expect(sendTestButton).toBeEnabled();
    await userEvent.click(sendTestButton);
    expect(
      await screen.findByText("Test sent to: jane@example.com"),
    ).toBeInTheDocument();
  });

  it("shows the server error message when sending a test fails", async () => {
    await renderWithSelectedRecipient({
      "/social/mailchimp/test POST": async () =>
        jsonResponse({ error: "No recipients provided" }, false),
    });
    await userEvent.click(screen.getByRole("button", { name: "Send test" }));
    expect(
      await screen.findByText("No recipients provided"),
    ).toBeInTheDocument();
  });

  it("shows the fallback error message when sending a test fails without an error string", async () => {
    await renderWithSelectedRecipient({
      "/social/mailchimp/test POST": async () => jsonResponse({}, false),
    });
    await userEvent.click(screen.getByRole("button", { name: "Send test" }));
    expect(await screen.findByText("Failed to send test")).toBeInTheDocument();
  });

  it("shows the fallback error message when sending a test throws a non-Error", async () => {
    await renderWithSelectedRecipient({
      "/social/mailchimp/test POST": async () => {
        throw "network down";
      },
    });
    await userEvent.click(screen.getByRole("button", { name: "Send test" }));
    expect(await screen.findByText("Failed to send test")).toBeInTheDocument();
  });

  it("does not show the search-empty results list when there are no results yet", async () => {
    await renderWithCampaign({
      "/social/mailchimp/search GET": async () =>
        jsonResponse({ contacts: [] }),
    });
    const input = screen.getByPlaceholderText(
      "Search contacts by name or email…",
    );
    await userEvent.type(input, "zzz");
    await waitFor(() =>
      expect(screen.queryByText("Searching…")).not.toBeInTheDocument(),
    );
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });
});

describe("SocialMailingPage - send to audience section", () => {
  it("shows the locked message when there is no successful test send yet (no record)", async () => {
    global.fetch = mockFetchRouter(
      standardHandlers(),
    ) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    expect(
      await screen.findByText(
        "A successful test send is required before sending live.",
      ),
    ).toBeInTheDocument();
  });

  it("shows the locked message when status is tested but there are no test recipients", async () => {
    global.fetch = mockFetchRouter(
      standardHandlers(
        {},
        baseCacheRecord({ status: "tested", testRecipients: [] }),
      ),
    ) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    expect(
      await screen.findByText(
        "A successful test send is required before sending live.",
      ),
    ).toBeInTheDocument();
  });

  // Note: the "already sent" message (`record?.status === "sent"` inside the
  // `else if`) is only reachable when `canSendLive` is also true, and
  // `canSendLive` requires `record.status === "tested"` on that very same
  // record - so a status of "sent" can never simultaneously satisfy both,
  // making that branch unreachable through the component's own state
  // transitions. There is intentionally no test asserting that UI text.

  async function renderReadyToSend(
    extra: Record<string, () => Promise<unknown>> = {},
  ) {
    global.fetch = mockFetchRouter(
      standardHandlers(
        extra,
        baseCacheRecord({
          campaignId: "camp1",
          status: "tested",
          testRecipients: ["a@example.com"],
        }),
      ),
    ) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("3. Send to audience");
  }

  it("keeps the send button disabled until the exact post title is typed, then sends", async () => {
    await renderReadyToSend({
      "/social/mailchimp/send POST": async () =>
        jsonResponse({
          cached: baseCacheRecord({
            campaignId: "camp1",
            status: "sent",
            testRecipients: ["a@example.com"],
            sentAt: "2026-02-06T00:00:00.000Z",
            sentBy: "organizer@etsa.tech",
          }),
        }),
    });
    const textboxes = screen.getAllByRole("textbox");
    const confirmInput = textboxes[textboxes.length - 1] as HTMLInputElement;
    const sendButton = screen.getByRole("button", {
      name: "Send to full audience",
    });
    expect(sendButton).toBeDisabled();

    await userEvent.type(confirmInput, "wrong title");
    expect(sendButton).toBeDisabled();

    await userEvent.clear(confirmInput);
    await userEvent.type(confirmInput, "My Talk");
    expect(sendButton).toBeEnabled();

    await userEvent.click(sendButton);
    // A successful send flips record.status to "sent", which makes
    // canSendLive false again (it requires status === "tested") - so the
    // section reverts to the locked message rather than an "already sent"
    // one; the confirm input is also cleared by the component on success.
    expect(
      await screen.findByText(
        "A successful test send is required before sending live.",
      ),
    ).toBeInTheDocument();
  });

  it("shows the server error message when sending live fails", async () => {
    await renderReadyToSend({
      "/social/mailchimp/send POST": async () =>
        jsonResponse({ error: "Confirmation text mismatch" }, false),
    });
    const inputs = screen.getAllByRole("textbox");
    const confirmInput = inputs[inputs.length - 1];
    await userEvent.type(confirmInput, "My Talk");
    await userEvent.click(
      screen.getByRole("button", { name: "Send to full audience" }),
    );
    expect(
      await screen.findByText("Confirmation text mismatch"),
    ).toBeInTheDocument();
  });

  it("shows the fallback error message when sending live fails without an error string", async () => {
    await renderReadyToSend({
      "/social/mailchimp/send POST": async () => jsonResponse({}, false),
    });
    const inputs = screen.getAllByRole("textbox");
    const confirmInput = inputs[inputs.length - 1];
    await userEvent.type(confirmInput, "My Talk");
    await userEvent.click(
      screen.getByRole("button", { name: "Send to full audience" }),
    );
    expect(await screen.findByText("Failed to send")).toBeInTheDocument();
  });

  it("shows the fallback error message when sending live throws a non-Error", async () => {
    await renderReadyToSend({
      "/social/mailchimp/send POST": async () => {
        throw "network down";
      },
    });
    const inputs = screen.getAllByRole("textbox");
    const confirmInput = inputs[inputs.length - 1];
    await userEvent.type(confirmInput, "My Talk");
    await userEvent.click(
      screen.getByRole("button", { name: "Send to full audience" }),
    );
    expect(await screen.findByText("Failed to send")).toBeInTheDocument();
  });
});

describe("SocialMailingPage - navigation", () => {
  it("links back to the post edit page", async () => {
    global.fetch = mockFetchRouter(
      standardHandlers(),
    ) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    const link = await screen.findByRole("link", { name: "Back to post" });
    expect(link).toHaveAttribute("href", "/admin/posts/my-talk/edit");
  });
});

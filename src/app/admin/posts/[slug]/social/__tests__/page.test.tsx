/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useParams } from "next/navigation";
import SocialMailingPage from "@/app/admin/posts/[slug]/social/page";

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

const frontmatter = {
  title: "My Talk",
  speakers: [{ name: "Jane Doe", bio: "Bio text", company: "Acme" }],
  eventDate: "2026-02-01",
  presentationDescription: "Abstract text",
};

function mockFetchDefault(overrides: Record<string, unknown> = {}) {
  return jest.fn().mockImplementation((url: string) => {
    if (url.includes("/status"))
      return Promise.resolve(jsonResponse({ cached: null }));
    if (url.endsWith(`/admin/posts/my-talk`)) {
      return Promise.resolve(
        jsonResponse({ frontmatter: { ...frontmatter, ...overrides } }),
      );
    }
    return Promise.resolve(jsonResponse({}));
  });
}

describe("SocialMailingPage", () => {
  it("shows a loading state, then the composed post details", async () => {
    global.fetch = mockFetchDefault() as unknown as typeof fetch;
    render(<SocialMailingPage />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(
      await screen.findByText("Mailchimp announcement"),
    ).toBeInTheDocument();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("Bio text")).toBeInTheDocument();
    expect(screen.getByText("Abstract text")).toBeInTheDocument();
  });

  it("shows a load error when the post fetch fails", async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes("/status"))
        return Promise.resolve(jsonResponse({ cached: null }));
      return Promise.resolve(jsonResponse({}, false));
    }) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    expect(await screen.findByText("Failed to load post.")).toBeInTheDocument();
  });

  it("shows a guard message for blog posts instead of the mailing UI", async () => {
    global.fetch = mockFetchDefault({
      blogpost: true,
    }) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    expect(
      await screen.findByText(
        /Social mailings are only available for presentation posts/,
      ),
    ).toBeInTheDocument();
  });

  it("shows the status badge, Mailchimp link, and sent info once a record loads", async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes("/status")) {
        return Promise.resolve(
          jsonResponse({
            cached: {
              status: "sent",
              campaignId: "c1",
              campaignUrl: "https://mailchimp.com/campaigns/c1",
              testRecipients: ["a@example.com"],
              sentAt: "2026-01-01T00:00:00.000Z",
              sentBy: "organizer@etsa.tech",
            },
          }),
        );
      }
      return Promise.resolve(jsonResponse({ frontmatter }));
    }) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    expect(await screen.findByText("sent")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Open in Mailchimp/ }),
    ).toHaveAttribute("href", "https://mailchimp.com/campaigns/c1");
    expect(
      screen.getByText(/sent .* by organizer@etsa\.tech/),
    ).toBeInTheDocument();
    // canSendLive requires status === "tested", so with status "sent" the
    // "already sent" branch is unreachable - the gate message shows instead.
    expect(
      screen.getByText(
        "A successful test send is required before sending live.",
      ),
    ).toBeInTheDocument();
  });

  it("creates a draft and updates the button label to 'Recreate draft'", async () => {
    const fetchMock = mockFetchDefault();
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes("/status"))
        return Promise.resolve(jsonResponse({ cached: null }));
      if (url.endsWith("/my-talk"))
        return Promise.resolve(jsonResponse({ frontmatter }));
      if (init?.method === "POST" && url.includes("/draft")) {
        return Promise.resolve(
          jsonResponse({
            cached: { status: "draft", campaignId: "c1", testRecipients: [] },
          }),
        );
      }
      return Promise.resolve(jsonResponse({}));
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("Mailchimp announcement");

    await userEvent.click(
      screen.getByRole("button", { name: "Create draft campaign" }),
    );
    expect(
      await screen.findByRole("button", {
        name: "Recreate draft from current content",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Create a draft first.")).not.toBeInTheDocument();
  });

  it("shows a draft error message when draft creation fails", async () => {
    const fetchMock = jest
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes("/status"))
          return Promise.resolve(jsonResponse({ cached: null }));
        if (init?.method === "POST" && url.includes("/draft")) {
          return Promise.resolve(
            jsonResponse({ error: "Mailchimp down" }, false),
          );
        }
        return Promise.resolve(jsonResponse({ frontmatter }));
      });
    global.fetch = fetchMock as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("Mailchimp announcement");
    await userEvent.click(
      screen.getByRole("button", { name: "Create draft campaign" }),
    );
    expect(await screen.findByText("Mailchimp down")).toBeInTheDocument();
  });

  it("searches contacts, adds and removes a recipient, then sends a test", async () => {
    const fetchMock = jest
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes("/status")) {
          return Promise.resolve(
            jsonResponse({
              cached: { status: "draft", campaignId: "c1", testRecipients: [] },
            }),
          );
        }
        if (url.includes("/search")) {
          return Promise.resolve(
            jsonResponse({
              contacts: [{ id: "1", email: "wes@example.com", name: "Wes" }],
            }),
          );
        }
        if (init?.method === "POST" && url.includes("/test")) {
          return Promise.resolve(
            jsonResponse({
              cached: {
                status: "tested",
                campaignId: "c1",
                testRecipients: ["wes@example.com"],
              },
            }),
          );
        }
        return Promise.resolve(jsonResponse({ frontmatter }));
      });
    global.fetch = fetchMock as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("Mailchimp announcement");

    await userEvent.type(screen.getByPlaceholderText(/Search contacts/), "wes");
    await userEvent.click(await screen.findByText(/Wes — wes@example.com/));
    expect(screen.getByText("wes@example.com")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Send test" }));
    expect(
      await screen.findByText(/Test sent to: wes@example.com/),
    ).toBeInTheDocument();
  });

  it("removes a selected recipient before sending", async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes("/status")) {
        return Promise.resolve(
          jsonResponse({
            cached: { status: "draft", campaignId: "c1", testRecipients: [] },
          }),
        );
      }
      if (url.includes("/search")) {
        return Promise.resolve(
          jsonResponse({ contacts: [{ id: "1", email: "wes@example.com" }] }),
        );
      }
      return Promise.resolve(jsonResponse({ frontmatter }));
    }) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("Mailchimp announcement");
    await userEvent.type(screen.getByPlaceholderText(/Search contacts/), "wes");
    await userEvent.click(await screen.findByText("wes@example.com"));
    await userEvent.click(
      screen.getByRole("button", { name: "Remove wes@example.com" }),
    );
    expect(screen.getByRole("button", { name: "Send test" })).toBeDisabled();
  });

  it("shows a test error message when sending a test fails", async () => {
    global.fetch = jest
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes("/status")) {
          return Promise.resolve(
            jsonResponse({
              cached: { status: "draft", campaignId: "c1", testRecipients: [] },
            }),
          );
        }
        if (url.includes("/search")) {
          return Promise.resolve(
            jsonResponse({ contacts: [{ id: "1", email: "wes@example.com" }] }),
          );
        }
        if (init?.method === "POST" && url.includes("/test")) {
          return Promise.resolve(
            jsonResponse({ error: "no recipients" }, false),
          );
        }
        return Promise.resolve(jsonResponse({ frontmatter }));
      }) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("Mailchimp announcement");
    await userEvent.type(screen.getByPlaceholderText(/Search contacts/), "wes");
    await userEvent.click(await screen.findByText("wes@example.com"));
    await userEvent.click(screen.getByRole("button", { name: "Send test" }));
    expect(await screen.findByText("no recipients")).toBeInTheDocument();
  });

  it("requires an exact title match before enabling the live send button", async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes("/status")) {
        return Promise.resolve(
          jsonResponse({
            cached: {
              status: "tested",
              campaignId: "c1",
              testRecipients: ["a@example.com"],
            },
          }),
        );
      }
      return Promise.resolve(jsonResponse({ frontmatter }));
    }) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("Mailchimp announcement");

    const confirmInput = screen.getByRole("textbox", { name: "Confirm send" });
    const sendButton = screen.getByRole("button", {
      name: "Send to full audience",
    });
    expect(sendButton).toBeDisabled();
    await userEvent.type(confirmInput, "My Talk");
    expect(sendButton).toBeEnabled();
  });

  it("does not fetch when slug is empty", () => {
    mockedUseParams.mockReturnValue({} as never);
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    render(<SocialMailingPage />);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("silently keeps no cached record when the status fetch is not ok", async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes("/status"))
        return Promise.resolve(jsonResponse({}, false));
      return Promise.resolve(jsonResponse({ frontmatter }));
    }) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    expect(
      await screen.findByText("Mailchimp announcement"),
    ).toBeInTheDocument();
    expect(screen.getByText("Create a draft first.")).toBeInTheDocument();
  });

  it("shows em dashes for every field when the post has no matching frontmatter at all", async () => {
    global.fetch = mockFetchDefault({
      title: undefined,
      speakers: undefined,
      eventDate: undefined,
      presentationDescription: undefined,
    }) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("Mailchimp announcement");
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(6);
  });

  it("falls back to top-level frontmatter fields when there is no speakers array", async () => {
    global.fetch = mockFetchDefault({
      speakers: undefined,
      speakerBio: "Top-level bio",
      speakerName: "Top-level Speaker",
      speakerCompany: "Top-level Co",
      eventDate: undefined,
      meetingDate: "2026-03-01",
      presentationDescription: undefined,
      excerpt: "Excerpt text",
    }) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("Mailchimp announcement");
    expect(screen.getByText("Top-level bio")).toBeInTheDocument();
    expect(screen.getByText("Top-level Speaker")).toBeInTheDocument();
    expect(screen.getByText("Top-level Co")).toBeInTheDocument();
    expect(screen.getByText("2026-03-01")).toBeInTheDocument();
    expect(screen.getByText("Excerpt text")).toBeInTheDocument();
  });

  it("shows a fallback draft-error message when the draft endpoint fails without an error string", async () => {
    const fetchMock = jest
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes("/status"))
          return Promise.resolve(jsonResponse({ cached: null }));
        if (init?.method === "POST" && url.includes("/draft")) {
          return Promise.resolve(jsonResponse({}, false));
        }
        return Promise.resolve(jsonResponse({ frontmatter }));
      });
    global.fetch = fetchMock as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("Mailchimp announcement");
    await userEvent.click(
      screen.getByRole("button", { name: "Create draft campaign" }),
    );
    expect(
      await screen.findByText("Failed to create draft"),
    ).toBeInTheDocument();
  });

  it("shows a fallback draft-error message when the draft request itself throws a non-Error", async () => {
    const fetchMock = jest
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes("/status"))
          return Promise.resolve(jsonResponse({ cached: null }));
        if (init?.method === "POST" && url.includes("/draft")) {
          return Promise.reject("network fail");
        }
        return Promise.resolve(jsonResponse({ frontmatter }));
      });
    global.fetch = fetchMock as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("Mailchimp announcement");
    await userEvent.click(
      screen.getByRole("button", { name: "Create draft campaign" }),
    );
    expect(
      await screen.findByText("Failed to create draft"),
    ).toBeInTheDocument();
  });

  it("clears search results when the search box is cleared and ignores a failed search response", async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes("/status")) {
        return Promise.resolve(
          jsonResponse({
            cached: { status: "draft", campaignId: "c1", testRecipients: [] },
          }),
        );
      }
      if (url.includes("/search"))
        return Promise.resolve(jsonResponse({}, false));
      return Promise.resolve(jsonResponse({ frontmatter }));
    }) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("Mailchimp announcement");
    const searchInput = screen.getByPlaceholderText(/Search contacts/);
    await userEvent.type(searchInput, "wes");
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    await userEvent.clear(searchInput);
    expect((searchInput as HTMLInputElement).value).toBe("");
  });

  it("does not add a duplicate recipient when the same contact is selected twice", async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes("/status")) {
        return Promise.resolve(
          jsonResponse({
            cached: { status: "draft", campaignId: "c1", testRecipients: [] },
          }),
        );
      }
      if (url.includes("/search")) {
        return Promise.resolve(
          jsonResponse({ contacts: [{ id: "1", email: "wes@example.com" }] }),
        );
      }
      return Promise.resolve(jsonResponse({ frontmatter }));
    }) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("Mailchimp announcement");
    const searchInput = screen.getByPlaceholderText(/Search contacts/);

    await userEvent.type(searchInput, "wes");
    await userEvent.click(
      await screen.findByRole("button", { name: "wes@example.com" }),
    );
    expect(screen.getAllByText("wes@example.com")).toHaveLength(1);

    await userEvent.type(searchInput, "wes");
    await userEvent.click(
      await screen.findByRole("button", { name: "wes@example.com" }),
    );
    expect(screen.getAllByText("wes@example.com")).toHaveLength(1);
  });

  it("shows a fallback test-error message when the test endpoint fails without an error string", async () => {
    global.fetch = jest
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes("/status")) {
          return Promise.resolve(
            jsonResponse({
              cached: { status: "draft", campaignId: "c1", testRecipients: [] },
            }),
          );
        }
        if (url.includes("/search")) {
          return Promise.resolve(
            jsonResponse({ contacts: [{ id: "1", email: "wes@example.com" }] }),
          );
        }
        if (init?.method === "POST" && url.includes("/test")) {
          return Promise.resolve(jsonResponse({}, false));
        }
        return Promise.resolve(jsonResponse({ frontmatter }));
      }) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("Mailchimp announcement");
    await userEvent.type(screen.getByPlaceholderText(/Search contacts/), "wes");
    await userEvent.click(await screen.findByText("wes@example.com"));
    await userEvent.click(screen.getByRole("button", { name: "Send test" }));
    expect(await screen.findByText("Failed to send test")).toBeInTheDocument();
  });

  it("shows a fallback test-error message when the test request itself throws a non-Error", async () => {
    global.fetch = jest
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes("/status")) {
          return Promise.resolve(
            jsonResponse({
              cached: { status: "draft", campaignId: "c1", testRecipients: [] },
            }),
          );
        }
        if (url.includes("/search")) {
          return Promise.resolve(
            jsonResponse({ contacts: [{ id: "1", email: "wes@example.com" }] }),
          );
        }
        if (init?.method === "POST" && url.includes("/test")) {
          return Promise.reject("network fail");
        }
        return Promise.resolve(jsonResponse({ frontmatter }));
      }) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("Mailchimp announcement");
    await userEvent.type(screen.getByPlaceholderText(/Search contacts/), "wes");
    await userEvent.click(await screen.findByText("wes@example.com"));
    await userEvent.click(screen.getByRole("button", { name: "Send test" }));
    expect(await screen.findByText("Failed to send test")).toBeInTheDocument();
  });

  it("sends live successfully", async () => {
    global.fetch = jest
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes("/status")) {
          return Promise.resolve(
            jsonResponse({
              cached: {
                status: "tested",
                campaignId: "c1",
                testRecipients: ["a@example.com"],
              },
            }),
          );
        }
        if (init?.method === "POST" && url.includes("/send")) {
          return Promise.resolve(
            jsonResponse({
              cached: {
                status: "sent",
                campaignId: "c1",
                testRecipients: ["a@example.com"],
              },
            }),
          );
        }
        return Promise.resolve(jsonResponse({ frontmatter }));
      }) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("Mailchimp announcement");
    await userEvent.type(
      screen.getByRole("textbox", { name: "Confirm send" }),
      "My Talk",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Send to full audience" }),
    );
    expect(await screen.findByText("sent")).toBeInTheDocument();
  });

  it("shows a fallback send-error message when the send endpoint fails without an error string", async () => {
    global.fetch = jest
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes("/status")) {
          return Promise.resolve(
            jsonResponse({
              cached: {
                status: "tested",
                campaignId: "c1",
                testRecipients: ["a@example.com"],
              },
            }),
          );
        }
        if (init?.method === "POST" && url.includes("/send")) {
          return Promise.resolve(jsonResponse({}, false));
        }
        return Promise.resolve(jsonResponse({ frontmatter }));
      }) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("Mailchimp announcement");
    await userEvent.type(
      screen.getByRole("textbox", { name: "Confirm send" }),
      "My Talk",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Send to full audience" }),
    );
    expect(await screen.findByText("Failed to send")).toBeInTheDocument();
  });

  it("shows a fallback send-error message when the send request itself throws a non-Error", async () => {
    global.fetch = jest
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes("/status")) {
          return Promise.resolve(
            jsonResponse({
              cached: {
                status: "tested",
                campaignId: "c1",
                testRecipients: ["a@example.com"],
              },
            }),
          );
        }
        if (init?.method === "POST" && url.includes("/send")) {
          return Promise.reject("network fail");
        }
        return Promise.resolve(jsonResponse({ frontmatter }));
      }) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("Mailchimp announcement");
    await userEvent.type(
      screen.getByRole("textbox", { name: "Confirm send" }),
      "My Talk",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Send to full audience" }),
    );
    expect(await screen.findByText("Failed to send")).toBeInTheDocument();
  });

  it("shows a Post to LinkedIn button, the composed template, and an unconnected speaker prompt by default", async () => {
    global.fetch = mockFetchDefault() as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("Mailchimp announcement");

    expect(
      screen.getByRole("button", { name: "Post to LinkedIn" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Jane Doe hasn't connected LinkedIn/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copy invite link" }),
    ).toBeInTheDocument();
  });

  it("saves the current draft text before navigating to LinkedIn authorize when Post to LinkedIn is clicked", async () => {
    const fetchMock = jest
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes("/social/linkedin/draft") && init?.method === "POST") {
          return Promise.resolve(jsonResponse({ success: true }));
        }
        if (url.includes("/social/linkedin/draft")) {
          return Promise.resolve(
            jsonResponse({ commentary: "Auto template text", isDraft: false }),
          );
        }
        if (url.includes("/status"))
          return Promise.resolve(jsonResponse({ cached: null }));
        return Promise.resolve(jsonResponse({ frontmatter }));
      });
    global.fetch = fetchMock as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("Mailchimp announcement");
    await screen.findByDisplayValue("Auto template text");

    await userEvent.click(
      screen.getByRole("button", { name: "Post to LinkedIn" }),
    );

    await waitFor(() => {
      const [, init] = fetchMock.mock.calls.find(
        ([url, i]: [string, RequestInit?]) =>
          i?.method === "POST" && url.includes("/social/linkedin/draft"),
      );
      expect(JSON.parse(init.body as string)).toEqual({
        commentary: "Auto template text",
      });
    });
  });

  it("shows an error and doesn't navigate when saving the draft before posting fails", async () => {
    global.fetch = jest
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes("/social/linkedin/draft") && init?.method === "POST") {
          return Promise.resolve(jsonResponse({ error: "Blobs down" }, false));
        }
        if (url.includes("/social/linkedin/draft")) {
          return Promise.resolve(
            jsonResponse({ commentary: "Auto template text", isDraft: false }),
          );
        }
        if (url.includes("/status"))
          return Promise.resolve(jsonResponse({ cached: null }));
        return Promise.resolve(jsonResponse({ frontmatter }));
      }) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("Mailchimp announcement");
    await screen.findByDisplayValue("Auto template text");

    await userEvent.click(
      screen.getByRole("button", { name: "Post to LinkedIn" }),
    );

    expect(await screen.findByText("Blobs down")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Post to LinkedIn" }),
    ).toBeInTheDocument();
  });

  it("shows a fallback error when saving the pre-post draft fails without an error string", async () => {
    global.fetch = jest
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes("/social/linkedin/draft") && init?.method === "POST") {
          return Promise.resolve(jsonResponse({}, false));
        }
        if (url.includes("/social/linkedin/draft")) {
          return Promise.resolve(
            jsonResponse({ commentary: "Auto template text", isDraft: false }),
          );
        }
        if (url.includes("/status"))
          return Promise.resolve(jsonResponse({ cached: null }));
        return Promise.resolve(jsonResponse({ frontmatter }));
      }) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("Mailchimp announcement");
    await screen.findByDisplayValue("Auto template text");

    await userEvent.click(
      screen.getByRole("button", { name: "Post to LinkedIn" }),
    );

    expect(await screen.findByText("Failed to save draft")).toBeInTheDocument();
  });

  it("shows a fallback error when saving the pre-post draft itself throws a non-Error", async () => {
    global.fetch = jest
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes("/social/linkedin/draft") && init?.method === "POST") {
          return Promise.reject("network fail");
        }
        if (url.includes("/social/linkedin/draft")) {
          return Promise.resolve(
            jsonResponse({ commentary: "Auto template text", isDraft: false }),
          );
        }
        if (url.includes("/status"))
          return Promise.resolve(jsonResponse({ cached: null }));
        return Promise.resolve(jsonResponse({ frontmatter }));
      }) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("Mailchimp announcement");
    await screen.findByDisplayValue("Auto template text");

    await userEvent.click(
      screen.getByRole("button", { name: "Post to LinkedIn" }),
    );

    expect(await screen.findByText("Failed to save draft")).toBeInTheDocument();
  });

  it("saves an edited draft via the Save draft button", async () => {
    const fetchMock = jest
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes("/social/linkedin/draft") && init?.method === "POST") {
          return Promise.resolve(jsonResponse({ success: true }));
        }
        if (url.includes("/social/linkedin/draft")) {
          return Promise.resolve(
            jsonResponse({ commentary: "Auto template text", isDraft: false }),
          );
        }
        if (url.includes("/status"))
          return Promise.resolve(jsonResponse({ cached: null }));
        return Promise.resolve(jsonResponse({ frontmatter }));
      });
    global.fetch = fetchMock as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("Mailchimp announcement");
    const textarea = await screen.findByDisplayValue("Auto template text");

    await userEvent.clear(textarea);
    await userEvent.type(textarea, "Edited text");
    await userEvent.click(screen.getByRole("button", { name: "Save draft" }));

    expect(
      await screen.findByRole("button", { name: "Saved!" }),
    ).toBeInTheDocument();
    const [, init] = fetchMock.mock.calls.find(
      ([url, i]: [string, RequestInit?]) =>
        i?.method === "POST" && url.includes("/social/linkedin/draft"),
    );
    expect(JSON.parse(init.body as string)).toEqual({
      commentary: "Edited text",
    });
  });

  it("shows an error when saving the draft fails", async () => {
    global.fetch = jest
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes("/social/linkedin/draft") && init?.method === "POST") {
          return Promise.resolve(jsonResponse({ error: "Blobs down" }, false));
        }
        if (url.includes("/social/linkedin/draft")) {
          return Promise.resolve(
            jsonResponse({ commentary: "Auto template text", isDraft: false }),
          );
        }
        if (url.includes("/status"))
          return Promise.resolve(jsonResponse({ cached: null }));
        return Promise.resolve(jsonResponse({ frontmatter }));
      }) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("Mailchimp announcement");
    await screen.findByDisplayValue("Auto template text");

    await userEvent.click(screen.getByRole("button", { name: "Save draft" }));

    expect(await screen.findByText("Blobs down")).toBeInTheDocument();
  });

  it("shows a fallback error when saving the draft fails without an error string", async () => {
    global.fetch = jest
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes("/social/linkedin/draft") && init?.method === "POST") {
          return Promise.resolve(jsonResponse({}, false));
        }
        if (url.includes("/social/linkedin/draft")) {
          return Promise.resolve(
            jsonResponse({ commentary: "Auto template text", isDraft: false }),
          );
        }
        if (url.includes("/status"))
          return Promise.resolve(jsonResponse({ cached: null }));
        return Promise.resolve(jsonResponse({ frontmatter }));
      }) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("Mailchimp announcement");
    await screen.findByDisplayValue("Auto template text");

    await userEvent.click(screen.getByRole("button", { name: "Save draft" }));

    expect(await screen.findByText("Failed to save draft")).toBeInTheDocument();
  });

  it("shows a fallback error when saving the draft itself throws a non-Error", async () => {
    global.fetch = jest
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes("/social/linkedin/draft") && init?.method === "POST") {
          return Promise.reject("network fail");
        }
        if (url.includes("/social/linkedin/draft")) {
          return Promise.resolve(
            jsonResponse({ commentary: "Auto template text", isDraft: false }),
          );
        }
        if (url.includes("/status"))
          return Promise.resolve(jsonResponse({ cached: null }));
        return Promise.resolve(jsonResponse({ frontmatter }));
      }) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("Mailchimp announcement");
    await screen.findByDisplayValue("Auto template text");

    await userEvent.click(screen.getByRole("button", { name: "Save draft" }));

    expect(await screen.findByText("Failed to save draft")).toBeInTheDocument();
  });

  it("resets the draft back to the freshly-generated template", async () => {
    const fetchMock = jest.fn().mockImplementation((url: string) => {
      if (url.includes("/social/linkedin/draft?fresh=1")) {
        return Promise.resolve(
          jsonResponse({ commentary: "Fresh template", isDraft: false }),
        );
      }
      if (url.includes("/social/linkedin/draft")) {
        return Promise.resolve(
          jsonResponse({ commentary: "Previously edited", isDraft: true }),
        );
      }
      if (url.includes("/status"))
        return Promise.resolve(jsonResponse({ cached: null }));
      return Promise.resolve(jsonResponse({ frontmatter }));
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("Mailchimp announcement");
    await screen.findByDisplayValue("Previously edited");

    await userEvent.click(
      screen.getByRole("button", { name: "Reset to template" }),
    );

    expect(
      await screen.findByDisplayValue("Fresh template"),
    ).toBeInTheDocument();
  });

  it("copies the speaker invite link to the clipboard - a URL the speaker can open without an admin login", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    global.fetch = mockFetchDefault() as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("Mailchimp announcement");

    await userEvent.click(
      screen.getByRole("button", { name: "Copy invite link" }),
    );

    expect(writeText).toHaveBeenCalledWith(
      "http://localhost/api/admin/posts/my-talk/social/linkedin/speaker/authorize?speaker=Jane%20Doe",
    );
    expect(
      await screen.findByRole("button", { name: "Link copied!" }),
    ).toBeInTheDocument();
  });

  it("shows a manual fallback link when copying to the clipboard fails", async () => {
    const writeText = jest.fn().mockRejectedValue(new Error("denied"));
    Object.assign(navigator, { clipboard: { writeText } });
    global.fetch = mockFetchDefault() as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("Mailchimp announcement");

    await userEvent.click(
      screen.getByRole("button", { name: "Copy invite link" }),
    );

    expect(
      await screen.findByText(/Couldn't copy automatically/),
    ).toBeInTheDocument();
  });

  it("shows the speaker as tagged once their LinkedIn is connected", async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes("/social/linkedin/status")) {
        return Promise.resolve(
          jsonResponse({ cached: null, speakerConnected: true }),
        );
      }
      if (url.includes("/status"))
        return Promise.resolve(jsonResponse({ cached: null }));
      return Promise.resolve(jsonResponse({ frontmatter }));
    }) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("Mailchimp announcement");
    expect(
      await screen.findByText("Jane Doe will be tagged."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unlink" })).toBeInTheDocument();
  });

  it("unlinks a connected speaker's LinkedIn", async () => {
    const fetchMock = jest
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (init?.method === "POST" && url.includes("/speaker/unlink")) {
          return Promise.resolve(jsonResponse({ success: true }));
        }
        if (url.includes("/social/linkedin/status")) {
          return Promise.resolve(
            jsonResponse({ cached: null, speakerConnected: true }),
          );
        }
        if (url.includes("/status"))
          return Promise.resolve(jsonResponse({ cached: null }));
        return Promise.resolve(jsonResponse({ frontmatter }));
      });
    global.fetch = fetchMock as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("Mailchimp announcement");
    await screen.findByText("Jane Doe will be tagged.");

    await userEvent.click(screen.getByRole("button", { name: "Unlink" }));

    expect(
      await screen.findByRole("button", { name: "Copy invite link" }),
    ).toBeInTheDocument();
    const [, init] = fetchMock.mock.calls.find(
      ([url, i]: [string, RequestInit?]) =>
        i?.method === "POST" && url.includes("/speaker/unlink"),
    );
    expect(JSON.parse(init.body as string)).toEqual({ speaker: "Jane Doe" });
  });

  it("shows an error when unlinking fails", async () => {
    global.fetch = jest
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (init?.method === "POST" && url.includes("/speaker/unlink")) {
          return Promise.resolve(jsonResponse({ error: "Blobs down" }, false));
        }
        if (url.includes("/social/linkedin/status")) {
          return Promise.resolve(
            jsonResponse({ cached: null, speakerConnected: true }),
          );
        }
        if (url.includes("/status"))
          return Promise.resolve(jsonResponse({ cached: null }));
        return Promise.resolve(jsonResponse({ frontmatter }));
      }) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("Mailchimp announcement");
    await screen.findByText("Jane Doe will be tagged.");

    await userEvent.click(screen.getByRole("button", { name: "Unlink" }));

    expect(await screen.findByText("Blobs down")).toBeInTheDocument();
  });

  it("shows a fallback unlink-error message when the endpoint fails without an error string", async () => {
    global.fetch = jest
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (init?.method === "POST" && url.includes("/speaker/unlink")) {
          return Promise.resolve(jsonResponse({}, false));
        }
        if (url.includes("/social/linkedin/status")) {
          return Promise.resolve(
            jsonResponse({ cached: null, speakerConnected: true }),
          );
        }
        if (url.includes("/status"))
          return Promise.resolve(jsonResponse({ cached: null }));
        return Promise.resolve(jsonResponse({ frontmatter }));
      }) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("Mailchimp announcement");
    await screen.findByText("Jane Doe will be tagged.");

    await userEvent.click(screen.getByRole("button", { name: "Unlink" }));

    expect(await screen.findByText("Failed to unlink")).toBeInTheDocument();
  });

  it("shows a fallback unlink-error message when the request itself throws a non-Error", async () => {
    global.fetch = jest
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (init?.method === "POST" && url.includes("/speaker/unlink")) {
          return Promise.reject("network fail");
        }
        if (url.includes("/social/linkedin/status")) {
          return Promise.resolve(
            jsonResponse({ cached: null, speakerConnected: true }),
          );
        }
        if (url.includes("/status"))
          return Promise.resolve(jsonResponse({ cached: null }));
        return Promise.resolve(jsonResponse({ frontmatter }));
      }) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("Mailchimp announcement");
    await screen.findByText("Jane Doe will be tagged.");

    await userEvent.click(screen.getByRole("button", { name: "Unlink" }));

    expect(await screen.findByText("Failed to unlink")).toBeInTheDocument();
  });

  it("promotes a connected speaker's LinkedIn to frontmatter and shows the auto-merging PR link", async () => {
    const fetchMock = jest
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (init?.method === "POST" && url.includes("/speaker/promote")) {
          return Promise.resolve(
            jsonResponse({
              success: true,
              prNumber: 42,
              prUrl: "https://github.com/etsa/etsa.tech/pull/42",
              isNewPR: true,
              autoMergeEnabled: true,
            }),
          );
        }
        if (url.includes("/social/linkedin/status")) {
          return Promise.resolve(
            jsonResponse({ cached: null, speakerConnected: true }),
          );
        }
        if (url.includes("/status"))
          return Promise.resolve(jsonResponse({ cached: null }));
        return Promise.resolve(jsonResponse({ frontmatter }));
      });
    global.fetch = fetchMock as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("Mailchimp announcement");
    await screen.findByText("Jane Doe will be tagged.");

    await userEvent.click(
      screen.getByRole("button", { name: "Promote to frontmatter" }),
    );

    expect(
      await screen.findByRole("link", { name: "View PR #42 ↗" }),
    ).toHaveAttribute("href", "https://github.com/etsa/etsa.tech/pull/42");
    expect(screen.getByText("- auto-merging.")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Promote to frontmatter" }),
    ).not.toBeInTheDocument();
    const [, init] = fetchMock.mock.calls.find(
      ([url, i]: [string, RequestInit?]) =>
        i?.method === "POST" && url.includes("/speaker/promote"),
    );
    expect(JSON.parse(init.body as string)).toEqual({ speaker: "Jane Doe" });
  });

  it("notes when auto-merge couldn't be enabled on the promote PR", async () => {
    global.fetch = jest
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (init?.method === "POST" && url.includes("/speaker/promote")) {
          return Promise.resolve(
            jsonResponse({
              success: true,
              prNumber: 42,
              prUrl: "https://github.com/etsa/etsa.tech/pull/42",
              isNewPR: true,
              autoMergeEnabled: false,
            }),
          );
        }
        if (url.includes("/social/linkedin/status")) {
          return Promise.resolve(
            jsonResponse({ cached: null, speakerConnected: true }),
          );
        }
        if (url.includes("/status"))
          return Promise.resolve(jsonResponse({ cached: null }));
        return Promise.resolve(jsonResponse({ frontmatter }));
      }) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("Mailchimp announcement");
    await screen.findByText("Jane Doe will be tagged.");

    await userEvent.click(
      screen.getByRole("button", { name: "Promote to frontmatter" }),
    );

    expect(
      await screen.findByText(
        "- auto-merge couldn't be enabled, merge it manually.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Promote to frontmatter" }),
    ).not.toBeInTheDocument();
  });

  it("shows an error when promoting to frontmatter fails", async () => {
    global.fetch = jest
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (init?.method === "POST" && url.includes("/speaker/promote")) {
          return Promise.resolve(jsonResponse({ error: "GitHub down" }, false));
        }
        if (url.includes("/social/linkedin/status")) {
          return Promise.resolve(
            jsonResponse({ cached: null, speakerConnected: true }),
          );
        }
        if (url.includes("/status"))
          return Promise.resolve(jsonResponse({ cached: null }));
        return Promise.resolve(jsonResponse({ frontmatter }));
      }) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("Mailchimp announcement");
    await screen.findByText("Jane Doe will be tagged.");

    await userEvent.click(
      screen.getByRole("button", { name: "Promote to frontmatter" }),
    );

    expect(await screen.findByText("GitHub down")).toBeInTheDocument();
  });

  it("shows a fallback promote-error message when the endpoint fails without an error string", async () => {
    global.fetch = jest
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (init?.method === "POST" && url.includes("/speaker/promote")) {
          return Promise.resolve(jsonResponse({}, false));
        }
        if (url.includes("/social/linkedin/status")) {
          return Promise.resolve(
            jsonResponse({ cached: null, speakerConnected: true }),
          );
        }
        if (url.includes("/status"))
          return Promise.resolve(jsonResponse({ cached: null }));
        return Promise.resolve(jsonResponse({ frontmatter }));
      }) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("Mailchimp announcement");
    await screen.findByText("Jane Doe will be tagged.");

    await userEvent.click(
      screen.getByRole("button", { name: "Promote to frontmatter" }),
    );

    expect(await screen.findByText("Failed to promote")).toBeInTheDocument();
  });

  it("shows a fallback promote-error message when the request itself throws a non-Error", async () => {
    global.fetch = jest
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (init?.method === "POST" && url.includes("/speaker/promote")) {
          return Promise.reject("network fail");
        }
        if (url.includes("/social/linkedin/status")) {
          return Promise.resolve(
            jsonResponse({ cached: null, speakerConnected: true }),
          );
        }
        if (url.includes("/status"))
          return Promise.resolve(jsonResponse({ cached: null }));
        return Promise.resolve(jsonResponse({ frontmatter }));
      }) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("Mailchimp announcement");
    await screen.findByText("Jane Doe will be tagged.");

    await userEvent.click(
      screen.getByRole("button", { name: "Promote to frontmatter" }),
    );

    expect(await screen.findByText("Failed to promote")).toBeInTheDocument();
  });

  it("shows an already-in-frontmatter indicator instead of the Promote button when frontmatter already matches", async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes("/social/linkedin/status")) {
        return Promise.resolve(
          jsonResponse({
            cached: null,
            speakerConnected: true,
            speakerUrn: "member-999",
          }),
        );
      }
      if (url.includes("/status"))
        return Promise.resolve(jsonResponse({ cached: null }));
      return Promise.resolve(
        jsonResponse({
          frontmatter: {
            ...frontmatter,
            speakers: [
              {
                name: "Jane Doe",
                bio: "Bio text",
                company: "Acme",
                linkedInUrn: "member-999",
              },
            ],
          },
        }),
      );
    }) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("Mailchimp announcement");
    await screen.findByText("Jane Doe will be tagged.");

    expect(screen.getByText("✓ Already in frontmatter")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Promote to frontmatter" }),
    ).not.toBeInTheDocument();
  });

  it("still shows the Promote button when frontmatter has a different (stale) urn than the connect store", async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes("/social/linkedin/status")) {
        return Promise.resolve(
          jsonResponse({
            cached: null,
            speakerConnected: true,
            speakerUrn: "member-999",
          }),
        );
      }
      if (url.includes("/status"))
        return Promise.resolve(jsonResponse({ cached: null }));
      return Promise.resolve(
        jsonResponse({
          frontmatter: {
            ...frontmatter,
            speakers: [
              {
                name: "Jane Doe",
                bio: "Bio text",
                company: "Acme",
                linkedInUrn: "stale-urn",
              },
            ],
          },
        }),
      );
    }) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("Mailchimp announcement");
    await screen.findByText("Jane Doe will be tagged.");

    expect(
      screen.getByRole("button", { name: "Promote to frontmatter" }),
    ).toBeInTheDocument();
  });

  it("shows the already-in-frontmatter indicator after promoting reports alreadyPromoted (e.g. a duplicate click)", async () => {
    global.fetch = jest
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (init?.method === "POST" && url.includes("/speaker/promote")) {
          return Promise.resolve(
            jsonResponse({ success: true, alreadyPromoted: true }),
          );
        }
        if (url.includes("/social/linkedin/status")) {
          return Promise.resolve(
            jsonResponse({
              cached: null,
              speakerConnected: true,
              speakerUrn: "member-999",
            }),
          );
        }
        if (url.includes("/status"))
          return Promise.resolve(jsonResponse({ cached: null }));
        return Promise.resolve(jsonResponse({ frontmatter }));
      }) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("Mailchimp announcement");
    await screen.findByText("Jane Doe will be tagged.");

    await userEvent.click(
      screen.getByRole("button", { name: "Promote to frontmatter" }),
    );

    expect(
      await screen.findByText("✓ Already in frontmatter"),
    ).toBeInTheDocument();
  });

  it("shows the frontmatter-cleanup PR link after unlinking a speaker who was promoted to frontmatter", async () => {
    global.fetch = jest
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (init?.method === "POST" && url.includes("/speaker/unlink")) {
          return Promise.resolve(
            jsonResponse({
              success: true,
              frontmatterCleared: true,
              prNumber: 43,
              prUrl: "https://github.com/etsa/etsa.tech/pull/43",
              isNewPR: true,
              autoMergeEnabled: true,
            }),
          );
        }
        if (url.includes("/social/linkedin/status")) {
          return Promise.resolve(
            jsonResponse({ cached: null, speakerConnected: true }),
          );
        }
        if (url.includes("/status"))
          return Promise.resolve(jsonResponse({ cached: null }));
        return Promise.resolve(jsonResponse({ frontmatter }));
      }) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("Mailchimp announcement");
    await screen.findByText("Jane Doe will be tagged.");

    await userEvent.click(screen.getByRole("button", { name: "Unlink" }));

    expect(
      await screen.findByRole("link", { name: "View PR #43 ↗" }),
    ).toHaveAttribute("href", "https://github.com/etsa/etsa.tech/pull/43");
    expect(
      screen.getByText(/Also removed from frontmatter/),
    ).toBeInTheDocument();
  });

  it("does not show a frontmatter-cleanup PR link when unlinking left frontmatter untouched", async () => {
    global.fetch = jest
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (init?.method === "POST" && url.includes("/speaker/unlink")) {
          return Promise.resolve(
            jsonResponse({ success: true, frontmatterCleared: false }),
          );
        }
        if (url.includes("/social/linkedin/status")) {
          return Promise.resolve(
            jsonResponse({ cached: null, speakerConnected: true }),
          );
        }
        if (url.includes("/status"))
          return Promise.resolve(jsonResponse({ cached: null }));
        return Promise.resolve(jsonResponse({ frontmatter }));
      }) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("Mailchimp announcement");
    await screen.findByText("Jane Doe will be tagged.");

    await userEvent.click(screen.getByRole("button", { name: "Unlink" }));
    await screen.findByRole("button", { name: "Copy invite link" });

    expect(
      screen.queryByText(/Also removed from frontmatter/),
    ).not.toBeInTheDocument();
  });

  it("shows the posted state with a View on LinkedIn link once a LinkedIn post exists", async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes("/social/linkedin/status")) {
        return Promise.resolve(
          jsonResponse({
            cached: {
              status: "sent",
              campaignId: "urn:li:share:abc",
              campaignUrl:
                "https://www.linkedin.com/feed/update/urn:li:share:abc/",
              sentAt: "2026-01-01T00:00:00.000Z",
              sentBy: "organizer@etsa.tech",
            },
            speakerConnected: false,
          }),
        );
      }
      if (url.includes("/status"))
        return Promise.resolve(jsonResponse({ cached: null }));
      return Promise.resolve(jsonResponse({ frontmatter }));
    }) as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("Mailchimp announcement");
    expect(
      screen.getByRole("link", { name: /View on LinkedIn/ }),
    ).toHaveAttribute(
      "href",
      "https://www.linkedin.com/feed/update/urn:li:share:abc/",
    );
    expect(
      screen.queryByRole("link", { name: "Post to LinkedIn" }),
    ).not.toBeInTheDocument();
  });

  it("shows a success banner from a linkedin_success redirect and cleans up the url", async () => {
    window.history.pushState(
      {},
      "",
      "/admin/posts/my-talk/social?linkedin_success=1",
    );
    global.fetch = mockFetchDefault() as unknown as typeof fetch;
    render(<SocialMailingPage />);
    expect(await screen.findByText("Posted to LinkedIn.")).toBeInTheDocument();
    expect(window.location.search).toBe("");
  });

  it("shows an error banner from a linkedin_error redirect", async () => {
    window.history.pushState(
      {},
      "",
      "/admin/posts/my-talk/social?linkedin_error=not_org_admin",
    );
    global.fetch = mockFetchDefault() as unknown as typeof fetch;
    render(<SocialMailingPage />);
    expect(
      await screen.findByText("LinkedIn post failed: not_org_admin"),
    ).toBeInTheDocument();
  });

  it("ignores stray linkedin_speaker_* params - that flow no longer redirects back here", async () => {
    window.history.pushState(
      {},
      "",
      "/admin/posts/my-talk/social?linkedin_speaker_success=Jane%20Doe",
    );
    global.fetch = mockFetchDefault() as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("Mailchimp announcement");
    expect(
      screen.queryByText(/Connected Jane Doe's LinkedIn for mentions\./),
    ).not.toBeInTheDocument();
  });

  it("sends live and shows a send error on failure", async () => {
    const fetchMock = jest
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes("/status")) {
          return Promise.resolve(
            jsonResponse({
              cached: {
                status: "tested",
                campaignId: "c1",
                testRecipients: ["a@example.com"],
              },
            }),
          );
        }
        if (init?.method === "POST" && url.includes("/send")) {
          return Promise.resolve(
            jsonResponse({ error: "confirmation mismatch" }, false),
          );
        }
        return Promise.resolve(jsonResponse({ frontmatter }));
      });
    global.fetch = fetchMock as unknown as typeof fetch;
    render(<SocialMailingPage />);
    await screen.findByText("Mailchimp announcement");
    await userEvent.type(
      screen.getByRole("textbox", { name: "Confirm send" }),
      "My Talk",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Send to full audience" }),
    );
    expect(
      await screen.findByText("confirmation mismatch"),
    ).toBeInTheDocument();
  });
});

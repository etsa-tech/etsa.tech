/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import GoogleMapEmbed from "@/components/GoogleMapEmbed";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

describe("GoogleMapEmbed", () => {
  it("shows a loading state, then the map iframe", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        embedUrl: "https://maps.example/embed",
        address: "x",
        zoom: 15,
      }),
    }) as unknown as typeof fetch;

    render(<GoogleMapEmbed address="123 Main St" />);
    expect(screen.getByText("Loading map...")).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByTitle("Location Map")).toHaveAttribute(
        "src",
        "https://maps.example/embed",
      ),
    );
  });

  it("shows an error with a Google Maps fallback link when the fetch fails", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false }) as unknown as typeof fetch;
    render(<GoogleMapEmbed address="123 Main St" />);
    await waitFor(() =>
      expect(screen.getByText(/Failed to load map/)).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("link", { name: /Open in Google Maps/ }),
    ).toHaveAttribute(
      "href",
      expect.stringContaining(encodeURIComponent("123 Main St")),
    );
  });

  it("shows an error state when fetch itself rejects", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("network down"));
    render(<GoogleMapEmbed address="123 Main St" />);
    await waitFor(() =>
      expect(screen.getByText(/Failed to load map/)).toBeInTheDocument(),
    );
  });

  it("does not fetch when address is empty", () => {
    global.fetch = jest.fn();
    render(<GoogleMapEmbed address="" />);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("shows the not-available state when the response has no embed URL", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ embedUrl: "", address: "x", zoom: 15 }),
    }) as unknown as typeof fetch;
    render(<GoogleMapEmbed address="123 Main St" />);
    expect(await screen.findByText("Map not available")).toBeInTheDocument();
  });
});

/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import GoogleMapEmbed from "@/components/GoogleMapEmbed";

describe("GoogleMapEmbed", () => {
  it("renders a keyless embed iframe for a given address and zoom", () => {
    render(<GoogleMapEmbed address="123 Main St" zoom={12} title="Venue" />);
    const iframe = screen.getByTitle("Venue");
    expect(iframe).toHaveAttribute(
      "src",
      expect.stringContaining(encodeURIComponent("123 Main St")),
    );
    expect(iframe).toHaveAttribute("src", expect.stringContaining("z=12"));
  });

  it("defaults zoom to 15 when not provided", () => {
    render(<GoogleMapEmbed address="123 Main St" />);
    expect(screen.getByTitle("Location Map")).toHaveAttribute(
      "src",
      expect.stringContaining("z=15"),
    );
  });

  it("shows the not-available state when address is empty", () => {
    render(<GoogleMapEmbed address="" />);
    expect(screen.getByText("Map not available")).toBeInTheDocument();
  });
});

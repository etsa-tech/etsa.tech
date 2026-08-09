/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { Footer } from "@/components/Footer";

describe("Footer", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_ORG_NAME: "ETSA",
      NEXT_PUBLIC_ORG_LOCATION: "East Tennessee",
      NEXT_PUBLIC_GITHUB_URL: "https://github.com/etsa",
      NEXT_PUBLIC_LINKEDIN_URL: "https://linkedin.com/company/etsa",
      NEXT_PUBLIC_MEETUP_URL: "https://meetup.com/etsa",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("renders the org name, location, and current-year copyright", () => {
    render(<Footer />);
    const year = new Date().getFullYear().toString();
    expect(screen.getAllByText("ETSA").length).toBeGreaterThan(0);
    expect(
      screen.getByText(
        (_, node) =>
          node?.textContent === `© ${year} ETSA. All rights reserved.`,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, node) => node?.textContent === "Built with ❤️ in East Tennessee",
      ),
    ).toBeInTheDocument();
  });

  it("renders social links pointing at the configured env URLs", () => {
    render(<Footer />);
    for (const link of screen.getAllByRole("link", { name: "GitHub" })) {
      expect(link).toHaveAttribute("href", "https://github.com/etsa");
    }
    for (const link of screen.getAllByRole("link", { name: "LinkedIn" })) {
      expect(link).toHaveAttribute("href", "https://linkedin.com/company/etsa");
    }
    expect(screen.getByRole("link", { name: "Meetup" })).toHaveAttribute(
      "href",
      "https://meetup.com/etsa",
    );
    expect(screen.getByRole("link", { name: "RSS Feed" })).toHaveAttribute(
      "href",
      "/rss.xml",
    );
  });

  it("renders sponsor links", () => {
    render(<Footer />);
    expect(screen.getByRole("link", { name: /Eldie Design/ })).toHaveAttribute(
      "href",
      "https://eldiedesign.com/",
    );
    expect(screen.getByRole("link", { name: /Givebutter/ })).toHaveAttribute(
      "href",
      "https://givebutter.com/etsa",
    );
    expect(screen.getByRole("link", { name: /TEKsystems/ })).toHaveAttribute(
      "href",
      "https://www.teksystems.com/",
    );
    expect(
      screen.getByRole("link", { name: /Zelvin Security/ }),
    ).toHaveAttribute("href", "https://www.zelvin.com/");
    expect(
      screen.getByRole("link", { name: "Become a Sponsor" }),
    ).toHaveAttribute("href", "/contact");
  });

  it("renders quick links and community links", () => {
    render(<Footer />);
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(
      screen.getAllByRole("link", { name: "Past Speakers" }).length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Meeting Info" })).toHaveAttribute(
      "href",
      "/meeting-info",
    );
    expect(screen.getByRole("link", { name: "About ETSA" })).toHaveAttribute(
      "href",
      "/about",
    );
    expect(screen.getByRole("link", { name: "Contact Us" })).toHaveAttribute(
      "href",
      "/contact",
    );
    expect(screen.getByRole("link", { name: "Join Meetup" })).toHaveAttribute(
      "href",
      "https://meetup.com/etsa",
    );
    expect(
      screen.getByRole("link", { name: "Become a Speaker" }),
    ).toHaveAttribute("href", "/speakers");
  });
});

/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { Footer } from "@/components/Footer";

const originalEnv = process.env;

beforeEach(() => {
  process.env = {
    ...originalEnv,
    NEXT_PUBLIC_MEETUP_URL: "https://meetup.com/etsa",
    NEXT_PUBLIC_GITHUB_URL: "https://github.com/etsa",
    NEXT_PUBLIC_LINKEDIN_URL: "https://linkedin.com/company/etsa",
  };
});

afterEach(() => {
  process.env = originalEnv;
});

describe("Footer", () => {
  it("renders the current year in the copyright line", () => {
    render(<Footer />);
    const year = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(`© ${year}`))).toBeInTheDocument();
  });

  it("renders sponsor links", () => {
    render(<Footer />);
    expect(screen.getByRole("link", { name: /Eldie Design/ })).toHaveAttribute(
      "href",
      "https://eldiedesign.com/",
    );
    expect(
      screen.getByRole("link", { name: /Become a Sponsor/ }),
    ).toBeInTheDocument();
  });

  it("renders quick links and community links", () => {
    render(<Footer />);
    expect(screen.getByRole("link", { name: "Past Speakers" })).toHaveAttribute(
      "href",
      "/speakers",
    );
    expect(
      screen.getByRole("link", { name: "Join Meetup" }),
    ).toBeInTheDocument();
  });

  it("renders a link to the privacy policy", () => {
    render(<Footer />);
    expect(
      screen.getByRole("link", { name: "Privacy Policy" }),
    ).toHaveAttribute("href", "/privacy");
  });

  it("lists Quick Links with Home first, then alphabetically", () => {
    render(<Footer />);
    const labels = [
      "Home",
      "About ETSA",
      "Contact Us",
      "Meeting Info",
      "Past Speakers",
      "Privacy Policy",
    ];
    const links = screen.getAllByRole("link");
    const positions = labels.map((label) =>
      links.findIndex((link) => link.textContent === label),
    );
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it("lists Community links alphabetically", () => {
    render(<Footer />);
    const labels = ["Become a Speaker", "GitHub", "Join Meetup", "LinkedIn"];
    const links = screen.getAllByRole("link");
    const positions = labels.map((label) =>
      links.findIndex((link) => link.textContent === label),
    );
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
});

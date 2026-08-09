/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import PrivacyPage from "@/app/privacy/page";

describe("PrivacyPage", () => {
  it("renders the heading", () => {
    render(<PrivacyPage />);
    expect(
      screen.getByRole("heading", { name: "Privacy Policy", level: 1 }),
    ).toBeInTheDocument();
  });

  it("states data is never sold or shared", () => {
    render(<PrivacyPage />);
    expect(
      screen.getByText(/never sell or share your personal information/i),
    ).toBeInTheDocument();
  });

  it("links to the contact page and contact email", () => {
    render(<PrivacyPage />);
    expect(
      screen.getAllByRole("link", { name: /contact form|contact page/i })[0],
    ).toHaveAttribute("href", "/contact");
    expect(
      screen.getAllByRole("link", { name: "website@etsa.tech" })[0],
    ).toHaveAttribute("href", "mailto:website@etsa.tech");
  });

  it("links out to each third-party service's privacy policy", () => {
    render(<PrivacyPage />);
    const privacyPolicyHrefs = screen
      .getAllByRole("link", { name: "Privacy Policy" })
      .map((link) => link.getAttribute("href"));
    expect(privacyPolicyHrefs).toContain("https://www.hcaptcha.com/privacy");
    expect(privacyPolicyHrefs).toContain(
      "https://help.meetup.com/hc/en-us/articles/360044422391-Privacy-Policy",
    );
    expect(
      screen.getByRole("link", { name: "Privacy Statement" }),
    ).toHaveAttribute(
      "href",
      "https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement",
    );
    expect(
      screen.getByRole("link", {
        name: "Maps/Google Earth Additional Terms of Service",
      }),
    ).toHaveAttribute(
      "href",
      "https://developers.google.com/maps/terms-20180207",
    );
    expect(
      screen.getByRole("link", { name: "Data Privacy & Security" }),
    ).toHaveAttribute(
      "href",
      "https://support.google.com/docs/answer/10381817?hl=en",
    );
  });
});

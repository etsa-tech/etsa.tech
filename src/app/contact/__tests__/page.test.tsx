/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import ContactPage from "@/app/contact/page";

jest.mock("@hcaptcha/react-hcaptcha", () => ({
  __esModule: true,
  default: () => <div data-testid="hcaptcha" />,
}));

describe("ContactPage", () => {
  it("renders the heading and the contact form", () => {
    render(<ContactPage />);
    expect(screen.getByText("Contact Us")).toBeInTheDocument();
    expect(screen.getByLabelText(/^Name/)).toBeInTheDocument();
  });
});

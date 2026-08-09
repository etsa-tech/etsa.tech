/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import LinkedInConnectedPage, { metadata } from "@/app/linkedin-connected/page";

describe("LinkedInConnectedPage", () => {
  it("is not indexed by search engines - it's only ever reached via a redirect", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("shows a success message with the speaker's name", async () => {
    render(
      await LinkedInConnectedPage({
        searchParams: Promise.resolve({
          status: "success",
          speaker: "Jane Doe",
        }),
      }),
    );
    expect(screen.getByText("You're connected!")).toBeInTheDocument();
    expect(screen.getByText(/Thanks, Jane Doe/)).toBeInTheDocument();
  });

  it("shows a generic success message when no speaker name is present", async () => {
    render(
      await LinkedInConnectedPage({
        searchParams: Promise.resolve({ status: "success" }),
      }),
    );
    expect(screen.getByText(/^Thanks - your LinkedIn/)).toBeInTheDocument();
  });

  it("shows an error message with the error code", async () => {
    render(
      await LinkedInConnectedPage({
        searchParams: Promise.resolve({
          status: "error",
          error: "invalid_state",
        }),
      }),
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("invalid_state")).toBeInTheDocument();
  });

  it("shows an error message even without an error code", async () => {
    render(await LinkedInConnectedPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });
});

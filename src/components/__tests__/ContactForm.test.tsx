/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { forwardRef, useImperativeHandle } from "react";
import ContactForm from "@/components/ContactForm";

let lastHCaptchaProps: {
  onVerify: (token: string) => void;
  onExpire: () => void;
  onError: () => void;
} | null = null;
const resetCaptcha = jest.fn();

jest.mock("@hcaptcha/react-hcaptcha", () => ({
  __esModule: true,
  default: forwardRef(function MockHCaptcha(
    props: never,
    ref: React.Ref<unknown>,
  ) {
    lastHCaptchaProps = props as never;
    useImperativeHandle(ref, () => ({ resetCaptcha }));
    return <div data-testid="hcaptcha" />;
  }),
}));

const originalFetch = global.fetch;

async function fillValidForm() {
  await userEvent.type(screen.getByLabelText(/Name/), "Jane Doe");
  await userEvent.type(screen.getByLabelText(/Email/), "jane@example.com");
  await userEvent.type(screen.getByLabelText(/Subject/), "Hello there");
  await userEvent.type(
    screen.getByLabelText(/Message/),
    "This is a long enough message.",
  );
  act(() => lastHCaptchaProps!.onVerify("captcha-token"));
}

beforeEach(() => {
  lastHCaptchaProps = null;
  resetCaptcha.mockClear();
});

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

describe("ContactForm", () => {
  it("blocks submission and shows field errors when required fields are empty", async () => {
    render(<ContactForm />);
    await userEvent.click(screen.getByRole("button", { name: "Send Message" }));
    expect(await screen.findByText(/Name is required/)).toBeInTheDocument();
    expect(screen.getByText(/complete the captcha/i)).toBeInTheDocument();
  });

  it("submits successfully and resets the form", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }) as unknown as typeof fetch;
    render(<ContactForm />);
    await fillValidForm();
    await userEvent.click(screen.getByRole("button", { name: "Send Message" }));

    expect(
      await screen.findByText(/Thank you for your message/),
    ).toBeInTheDocument();
    expect((screen.getByLabelText(/Name/) as HTMLInputElement).value).toBe("");
    expect(resetCaptcha).toHaveBeenCalled();
  });

  it("shows a server-provided error message on a failed submission", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Rate limited" }),
    }) as unknown as typeof fetch;
    render(<ContactForm />);
    await fillValidForm();
    await userEvent.click(screen.getByRole("button", { name: "Send Message" }));
    expect(await screen.findByText(/Network error/)).toBeInTheDocument();
  });

  it("falls back to a generic error when the server response has no error field", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    }) as unknown as typeof fetch;
    render(<ContactForm />);
    await fillValidForm();
    await userEvent.click(screen.getByRole("button", { name: "Send Message" }));
    expect(await screen.findByText(/Network error/)).toBeInTheDocument();
  });

  it("clears expired-captcha error via onExpire and shows a captcha error message", async () => {
    render(<ContactForm />);
    act(() => lastHCaptchaProps!.onExpire());
    expect(await screen.findByText(/Captcha expired/)).toBeInTheDocument();
  });

  it("shows a captcha error via onError", async () => {
    render(<ContactForm />);
    act(() => lastHCaptchaProps!.onError());
    expect(await screen.findByText(/Captcha error/)).toBeInTheDocument();
  });

  it("runs real-time field validation as the user types, then clears it when the field is emptied", async () => {
    render(<ContactForm />);
    const nameInput = screen.getByLabelText(/Name/);
    await userEvent.type(nameInput, "J");
    expect(
      await screen.findByText(/at least 2 characters/),
    ).toBeInTheDocument();
    await userEvent.clear(nameInput);
    await waitFor(() =>
      expect(
        screen.queryByText(/at least 2 characters/),
      ).not.toBeInTheDocument(),
    );
  });

  it("clears a prior submit status message once the user starts typing again", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Rate limited" }),
    }) as unknown as typeof fetch;
    render(<ContactForm />);
    await fillValidForm();
    await userEvent.click(screen.getByRole("button", { name: "Send Message" }));
    expect(await screen.findByText(/Network error/)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/Subject/), "!");
    expect(screen.queryByText(/Network error/)).not.toBeInTheDocument();
  });
});

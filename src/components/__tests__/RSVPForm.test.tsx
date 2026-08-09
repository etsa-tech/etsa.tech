/**
 * @jest-environment jsdom
 */
import { render, screen, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { forwardRef, useImperativeHandle } from "react";
import RSVPForm from "@/components/RSVPForm";
import {
  areCookiesSupported,
  loadRSVPDataFromCookies,
  saveRSVPDataToCookies,
  clearRSVPDataFromCookies,
} from "@/lib/cookies";

jest.mock("@/lib/cookies", () => ({
  areCookiesSupported: jest.fn(() => false),
  loadRSVPDataFromCookies: jest.fn(() => null),
  saveRSVPDataToCookies: jest.fn(),
  clearRSVPDataFromCookies: jest.fn(),
}));

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

const mockedAreCookiesSupported = jest.mocked(areCookiesSupported);
const mockedLoadRSVPDataFromCookies = jest.mocked(loadRSVPDataFromCookies);
const mockedSaveRSVPDataToCookies = jest.mocked(saveRSVPDataToCookies);
const mockedClearRSVPDataFromCookies = jest.mocked(clearRSVPDataFromCookies);

const originalFetch = global.fetch;

beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
});

beforeEach(() => {
  lastHCaptchaProps = null;
  resetCaptcha.mockClear();
  mockedAreCookiesSupported.mockReturnValue(false);
  mockedLoadRSVPDataFromCookies.mockReturnValue(null);
  jest.clearAllMocks();
  mockedAreCookiesSupported.mockReturnValue(false);
  mockedLoadRSVPDataFromCookies.mockReturnValue(null);
});

afterEach(() => {
  global.fetch = originalFetch;
});

async function fillRequiredFields() {
  await userEvent.type(screen.getByLabelText(/First Name/), "Jane");
  await userEvent.type(screen.getByLabelText(/Last Name/), "Doe");
  await userEvent.type(screen.getByLabelText(/Email/), "jane@example.com");
  await userEvent.click(screen.getByRole("radio", { name: "Yes" }));
  await userEvent.type(screen.getByLabelText(/How did you hear/), "Meetup");
  act(() => lastHCaptchaProps!.onVerify("captcha-token"));
}

describe("RSVPForm", () => {
  it("renders the meeting title and date", () => {
    render(<RSVPForm meetingDate="2026-01-01" meetingTitle="January Meetup" />);
    expect(screen.getByText("RSVP for January Meetup")).toBeInTheDocument();
    expect(screen.getByText(/Date: 2026-01-01/)).toBeInTheDocument();
  });

  it("blocks submission and shows validation errors when required fields are empty", async () => {
    render(<RSVPForm meetingDate="2026-01-01" />);
    await userEvent.click(screen.getByRole("button", { name: "Submit RSVP" }));
    expect(
      await screen.findByText("First name is required"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Please indicate if you can attend"),
    ).toBeInTheDocument();
    expect(screen.getByText(/complete the captcha/)).toBeInTheDocument();
  });

  it("submits successfully and resets the form", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }) as unknown as typeof fetch;
    render(<RSVPForm meetingDate="2026-01-01" />);
    await fillRequiredFields();
    await userEvent.click(screen.getByRole("button", { name: "Submit RSVP" }));

    expect(
      await screen.findByText(/Thank you for your RSVP/),
    ).toBeInTheDocument();
    expect(
      (screen.getByLabelText(/First Name/) as HTMLInputElement).value,
    ).toBe("");
    expect(resetCaptcha).toHaveBeenCalled();
    expect(mockedClearRSVPDataFromCookies).toHaveBeenCalled();
  });

  it("submits successfully with valid (non-empty) comments", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }) as unknown as typeof fetch;
    render(<RSVPForm meetingDate="2026-01-01" />);
    await fillRequiredFields();
    await userEvent.type(screen.getByLabelText(/Comments/), "See you there!");
    await userEvent.click(screen.getByRole("button", { name: "Submit RSVP" }));
    expect(
      await screen.findByText(/Thank you for your RSVP/),
    ).toBeInTheDocument();
  });

  it("blocks submission and shows a comments error when comments exceed the length limit", async () => {
    render(<RSVPForm meetingDate="2026-01-01" />);
    await fillRequiredFields();
    fireEvent.change(screen.getByLabelText(/Comments/), {
      target: { value: "x".repeat(501) },
    });
    await userEvent.click(screen.getByRole("button", { name: "Submit RSVP" }));
    expect(
      await screen.findByText(/Comments must be less than 500 characters/),
    ).toBeInTheDocument();
  });

  it("scrolls to the attendance radio group when it's the only missing required field", async () => {
    render(<RSVPForm meetingDate="2026-01-01" />);
    await userEvent.type(screen.getByLabelText(/First Name/), "Jane");
    await userEvent.type(screen.getByLabelText(/Last Name/), "Doe");
    await userEvent.type(screen.getByLabelText(/Email/), "jane@example.com");
    await userEvent.type(screen.getByLabelText(/How did you hear/), "Meetup");
    act(() => lastHCaptchaProps!.onVerify("captcha-token"));
    // canAttend intentionally left unselected.
    const scrollIntoViewMock = jest.fn();
    const canAttendGroup = document.getElementById("canAttend")!;
    canAttendGroup.scrollIntoView = scrollIntoViewMock;
    const firstRadio = document.getElementById("canAttend-first")!;
    const focusSpy = jest.spyOn(firstRadio, "focus");

    await userEvent.click(screen.getByRole("button", { name: "Submit RSVP" }));
    expect(
      await screen.findByText("Please indicate if you can attend"),
    ).toBeInTheDocument();
    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "center",
    });
    expect(focusSpy).toHaveBeenCalled();
  });

  it("also subscribes to the newsletter when opted in, tolerating a subscribe failure", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // /api/rsvp
      .mockResolvedValueOnce({ ok: false }); // /api/mailchimp-subscribe
    render(<RSVPForm meetingDate="2026-01-01" />);
    await fillRequiredFields();
    await userEvent.click(screen.getByLabelText(/Subscribe to our newsletter/));
    await userEvent.click(screen.getByRole("button", { name: "Submit RSVP" }));

    expect(
      await screen.findByText(/subscribed to our newsletter/),
    ).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/mailchimp-subscribe",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("subscribes to the newsletter successfully when opted in", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // /api/rsvp
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }); // /api/mailchimp-subscribe
    render(<RSVPForm meetingDate="2026-01-01" />);
    await fillRequiredFields();
    await userEvent.click(screen.getByLabelText(/Subscribe to our newsletter/));
    await userEvent.click(screen.getByRole("button", { name: "Submit RSVP" }));
    expect(
      await screen.findByText(/subscribed to our newsletter/),
    ).toBeInTheDocument();
  });

  it("shows a generic error message when the RSVP submission fails", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false }) as unknown as typeof fetch;
    render(<RSVPForm meetingDate="2026-01-01" />);
    await fillRequiredFields();
    await userEvent.click(screen.getByRole("button", { name: "Submit RSVP" }));
    expect(
      await screen.findByText(/Failed to submit RSVP/),
    ).toBeInTheDocument();
    expect(resetCaptcha).toHaveBeenCalled();
  });

  it("pre-fills from cookies and shows a 'clear saved information' control when data exists", async () => {
    mockedAreCookiesSupported.mockReturnValue(true);
    mockedLoadRSVPDataFromCookies.mockReturnValue({
      firstName: "Saved",
      lastName: "User",
      email: "saved@example.com",
      howDidYouHear: "Friend",
    });
    render(<RSVPForm meetingDate="2026-01-01" />);
    expect(
      (await screen.findByLabelText(/First Name/)) as HTMLInputElement,
    ).toHaveValue("Saved");
    expect(
      screen.getByRole("button", { name: "Clear saved information" }),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Clear saved information" }),
    );
    expect(mockedClearRSVPDataFromCookies).toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: "Clear saved information" }),
    ).not.toBeInTheDocument();
  });

  it("saves data to cookies on successful submit when saveDataForNextTime is checked", async () => {
    mockedAreCookiesSupported.mockReturnValue(true);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }) as unknown as typeof fetch;
    render(<RSVPForm meetingDate="2026-01-01" />);
    await fillRequiredFields();
    await userEvent.click(screen.getByLabelText(/Remember my information/));
    await userEvent.click(screen.getByRole("button", { name: "Submit RSVP" }));
    expect(
      await screen.findByText(/Thank you for your RSVP/),
    ).toBeInTheDocument();
    expect(mockedSaveRSVPDataToCookies).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: "Jane", lastName: "Doe" }),
    );
  });

  it("resets the captcha token when it expires", async () => {
    render(<RSVPForm meetingDate="2026-01-01" />);
    await userEvent.type(screen.getByLabelText(/First Name/), "Jane");
    await userEvent.type(screen.getByLabelText(/Last Name/), "Doe");
    await userEvent.type(screen.getByLabelText(/Email/), "jane@example.com");
    await userEvent.click(screen.getByRole("radio", { name: "Yes" }));
    await userEvent.type(screen.getByLabelText(/How did you hear/), "Meetup");
    act(() => lastHCaptchaProps!.onVerify("tok"));
    act(() => lastHCaptchaProps!.onExpire());

    await userEvent.click(screen.getByRole("button", { name: "Submit RSVP" }));
    expect(
      await screen.findByText("Please complete the captcha verification"),
    ).toBeInTheDocument();
  });

  it("clears the captcha error once a token is verified", async () => {
    render(<RSVPForm meetingDate="2026-01-01" />);
    act(() => lastHCaptchaProps!.onError());
    expect(
      await screen.findByText(/Captcha verification failed/),
    ).toBeInTheDocument();
    act(() => lastHCaptchaProps!.onVerify("tok"));
    expect(
      screen.queryByText(/Captcha verification failed/),
    ).not.toBeInTheDocument();
  });

  it("runs real-time validation and clears the error once the field is emptied", async () => {
    render(<RSVPForm meetingDate="2026-01-01" />);
    const firstName = screen.getByLabelText(/First Name/);
    await userEvent.type(firstName, "J");
    expect(
      await screen.findByText(/at least 2 characters/),
    ).toBeInTheDocument();
    await userEvent.clear(firstName);
    expect(screen.queryByText(/at least 2 characters/)).not.toBeInTheDocument();
  });
});

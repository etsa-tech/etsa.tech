import { createTransporter } from "@/lib/email-config";
import { sendContactEmail } from "@/lib/server-only-email";

jest.mock("@/lib/email-config", () => ({ createTransporter: jest.fn() }));

const mockedCreateTransporter = jest.mocked(createTransporter);

const formData = {
  name: "Jane <script>",
  email: "jane@example.com",
  subject: "Hello & welcome",
  message: "Line one\nLine two",
  hostname: "etsa.tech",
};

afterEach(() => jest.resetAllMocks());

describe("sendContactEmail", () => {
  it("sends the email and returns success", async () => {
    const verify = jest.fn().mockResolvedValue(undefined);
    const sendMail = jest.fn().mockResolvedValue({ messageId: "abc" });
    mockedCreateTransporter.mockReturnValue({
      verify,
      sendMail,
    } as unknown as ReturnType<typeof createTransporter>);

    const result = await sendContactEmail(formData);
    expect(result).toEqual({ success: true });
    expect(verify).toHaveBeenCalled();
    const call = sendMail.mock.calls[0][0];
    expect(call.subject).toBe("[ETSA Contact] Hello & welcome");
    expect(call.html).toContain("&lt;script&gt;");
    expect(call.text).toContain("Jane <script>");
  });

  it("defaults hostname to Unknown when not provided", async () => {
    const sendMail = jest.fn().mockResolvedValue({ messageId: "abc" });
    mockedCreateTransporter.mockReturnValue({
      verify: jest.fn().mockResolvedValue(undefined),
      sendMail,
    } as unknown as ReturnType<typeof createTransporter>);

    await sendContactEmail({ ...formData, hostname: undefined });
    expect(sendMail.mock.calls[0][0].html).toContain("Hostname: Unknown");
  });

  it("returns a config error when transporter verification fails", async () => {
    mockedCreateTransporter.mockReturnValue({
      verify: jest.fn().mockRejectedValue(new Error("bad config")),
      sendMail: jest.fn(),
    } as unknown as ReturnType<typeof createTransporter>);

    const result = await sendContactEmail(formData);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/configuration error/i);
  });

  it("returns a send error when sendMail throws", async () => {
    mockedCreateTransporter.mockReturnValue({
      verify: jest.fn().mockResolvedValue(undefined),
      sendMail: jest.fn().mockRejectedValue(new Error("smtp down")),
    } as unknown as ReturnType<typeof createTransporter>);

    const result = await sendContactEmail(formData);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/failed to send/i);
  });

  it("returns a send error when createTransporter itself throws", async () => {
    mockedCreateTransporter.mockImplementation(() => {
      throw new Error("missing env vars");
    });
    const result = await sendContactEmail(formData);
    expect(result.success).toBe(false);
  });
});

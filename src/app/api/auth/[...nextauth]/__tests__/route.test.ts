const mockHandler = jest.fn();
const mockNextAuth = jest.fn(() => mockHandler);

jest.mock("next-auth", () => ({ __esModule: true, default: mockNextAuth }));
jest.mock("@/lib/auth", () => ({ authOptions: { fake: true } }));

describe("NextAuth catch-all route", () => {
  it("wires GET and POST to the same NextAuth handler", async () => {
    const { GET, POST } = await import("../route");
    expect(GET).toBe(mockHandler);
    expect(POST).toBe(mockHandler);
    expect(mockNextAuth).toHaveBeenCalledWith({ fake: true });
  });
});

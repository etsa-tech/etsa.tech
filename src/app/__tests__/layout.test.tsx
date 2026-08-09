import RootLayout, { metadata } from "@/app/layout";

jest.mock("@/components/ThemeProvider", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@/components/Header", () => ({ Header: () => null }));
jest.mock("@/components/Footer", () => ({ Footer: () => null }));
jest.mock("@/components/Overtracking", () => ({
  __esModule: true,
  default: () => null,
}));

describe("RootLayout", () => {
  it("wraps children in the expected html/body structure", () => {
    const element = RootLayout({ children: "child content" as never });
    expect(element.type).toBe("html");
    expect(element.props.lang).toBe("en");
    const [head, body] = element.props.children;
    expect(head.type).toBe("head");
    expect(body.type).toBe("body");
  });

  it("exports page metadata with the org name as title", () => {
    expect(metadata.title).toBe(process.env.NEXT_PUBLIC_ORG_NAME);
  });
});

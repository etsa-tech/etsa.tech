import robots from "@/app/robots";

const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});

describe("robots", () => {
  it("uses the default site URL and excludes admin* only in production", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "development",
      configurable: true,
    });
    const result = robots();
    expect(result.sitemap).toBe("https://etsa.tech/sitemap.xml");
    expect(result.host).toBe("https://etsa.tech");
    const wildcard = result.rules as { disallow?: string[] }[];
    expect(wildcard[0].disallow).not.toContain("/admin/*");
  });

  it("adds the admin wildcard disallow rule in production", () => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "production",
      configurable: true,
    });
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com";
    const result = robots();
    expect(result.sitemap).toBe("https://example.com/sitemap.xml");
    const wildcard = result.rules as { disallow?: string[] }[];
    expect(wildcard[0].disallow).toContain("/admin/*");
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "test",
      configurable: true,
    });
  });
});

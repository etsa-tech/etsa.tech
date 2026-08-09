import { NextRequest } from "next/server";
import { GET } from "../route";

function req(query: string) {
  return new NextRequest(`http://localhost/api/maps/embed${query}`);
}

describe("GET /api/maps/embed", () => {
  it("returns a keyless embed URL for a valid address", async () => {
    const res = await GET(req("?address=123+Main+St&zoom=12"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.embedUrl).toContain(encodeURIComponent("123 Main St"));
    expect(body.zoom).toBe(12);
  });

  it("defaults zoom to 15 when not provided", async () => {
    const res = await GET(req("?address=123+Main+St"));
    const body = await res.json();
    expect(body.zoom).toBe(15);
  });

  it("400s when address is missing", async () => {
    const res = await GET(req(""));
    expect(res.status).toBe(400);
  });
});

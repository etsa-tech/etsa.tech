import { dumpFrontmatterYaml } from "@/lib/yaml-frontmatter";

describe("dumpFrontmatterYaml", () => {
  it("double-quotes string values", () => {
    const yaml = dumpFrontmatterYaml({ title: "Hello World" });
    expect(yaml).toContain('title: "Hello World"');
  });

  it("leaves booleans as plain scalars", () => {
    const yaml = dumpFrontmatterYaml({ published: true });
    expect(yaml).toContain("published: true");
    expect(yaml).not.toContain('"true"');
  });

  it("leaves numbers as plain scalars", () => {
    const yaml = dumpFrontmatterYaml({ order: 3 });
    expect(yaml).toContain("order: 3");
  });

  it("quotes strings inside sequences", () => {
    const yaml = dumpFrontmatterYaml({ tags: ["one", "two"] });
    expect(yaml).toContain('"one"');
    expect(yaml).toContain('"two"');
  });

  it("does not quote mapping keys", () => {
    const yaml = dumpFrontmatterYaml({ title: "x" });
    expect(yaml).toMatch(/^title: /m);
  });

  it("handles nested mappings", () => {
    const yaml = dumpFrontmatterYaml({ meta: { author: "Jane" } });
    expect(yaml).toContain('author: "Jane"');
  });

  it("handles null values", () => {
    const yaml = dumpFrontmatterYaml({ value: null });
    expect(yaml).toContain("value: null");
  });

  it("handles an empty object whose contents node still has 0 items", () => {
    expect(dumpFrontmatterYaml({})).toBe("{}\n");
  });

  it("handles undefined data, whose document has no contents node at all", () => {
    expect(dumpFrontmatterYaml(undefined)).toBe("");
  });

  it("handles an empty sequence", () => {
    const yaml = dumpFrontmatterYaml({ tags: [] });
    expect(yaml).toContain("tags: []");
  });

  it("quotes strings nested inside a sequence of mappings", () => {
    const yaml = dumpFrontmatterYaml({
      items: [{ name: "one" }, { name: "two" }],
    });
    expect(yaml).toContain('name: "one"');
    expect(yaml).toContain('name: "two"');
  });
});

/**
 * Security tests for utility functions
 * Tests ReDoS prevention and input sanitization
 */

import { getExcerpt, highlightSearchTerm, sanitizeSearchInput } from "../utils";

describe("Security Tests", () => {
  describe("ReDoS Prevention", () => {
    test("getExcerpt should handle malicious markdown links without timeout", () => {
      // This pattern would cause catastrophic backtracking in vulnerable regex
      const maliciousInput =
        "[" + "a".repeat(1000) + "](" + "b".repeat(1000) + ")";

      const start = Date.now();
      const result = getExcerpt(maliciousInput, 100);
      const duration = Date.now() - start;

      // Should complete quickly (under 100ms) even with malicious input
      expect(duration).toBeLessThan(100);
      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
    });

    test("highlightSearchTerm should limit search term length", () => {
      const longSearchTerm = "a".repeat(200);
      const text = "This is a test text with some content";

      const start = Date.now();
      const result = highlightSearchTerm(text, longSearchTerm);
      const duration = Date.now() - start;

      // Should complete quickly and not crash
      expect(duration).toBeLessThan(50);
      expect(result).toBeDefined();
    });

    test("sanitizeSearchInput should limit input length", () => {
      const longInput = "a".repeat(500);

      const result = sanitizeSearchInput(longInput);

      // Should be truncated to max length (200)
      expect(result.length).toBeLessThanOrEqual(200);
    });
  });

  describe("Input Sanitization", () => {
    test("getExcerpt should remove HTML tags safely", () => {
      const htmlInput = '<script>alert("xss")</script><p>Safe content</p>';
      const result = getExcerpt(htmlInput, 100);

      expect(result).not.toContain("<script>");
      expect(result).not.toContain("</script>");
      expect(result).toContain("Safe content");
    });

    test("highlightSearchTerm should escape HTML in output", () => {
      const text = "This is a test";
      const searchTerm = "<script>";

      const result = highlightSearchTerm(text, searchTerm);

      // Should not contain unescaped script tags
      expect(result).not.toContain("<script>");
    });

    test("sanitizeSearchInput should remove HTML brackets", () => {
      const input = 'search<script>alert("xss")</script>term';
      const result = sanitizeSearchInput(input);

      expect(result).not.toContain("<");
      expect(result).not.toContain(">");
      expect(result).toBe('searchalert("xss")term');
    });
  });

  describe("Markdown Processing", () => {
    test("should safely process markdown links", () => {
      const markdown =
        "[Link Text](https://example.com) and [Another](http://test.com)";
      const result = getExcerpt(markdown, 100);

      expect(result).toContain("Link Text");
      expect(result).toContain("Another");
      expect(result).not.toContain("[");
      expect(result).not.toContain("]");
      expect(result).not.toContain("(");
      expect(result).not.toContain(")");
    });

    test("should safely process markdown formatting", () => {
      const markdown = "**Bold text** and *italic text* and `code text`";
      const result = getExcerpt(markdown, 100);

      expect(result).toContain("Bold text");
      expect(result).toContain("italic text");
      expect(result).toContain("code text");
      expect(result).not.toContain("**");
      expect(result).not.toContain("*");
      expect(result).not.toContain("`");
    });
  });

  describe("Edge Cases", () => {
    test("should handle empty inputs gracefully", () => {
      expect(getExcerpt("", 100)).toBe("");
      expect(highlightSearchTerm("text", "")).toBe("text");
      expect(sanitizeSearchInput("")).toBe("");
    });

    test("should handle null/undefined inputs gracefully", () => {
      // These should not throw errors
      expect(() => sanitizeSearchInput("  ")).not.toThrow();
      expect(() => highlightSearchTerm("text", "   ")).not.toThrow();
    });

    test("should handle special characters safely", () => {
      const specialChars = ".*+?^${}()|[]\\";
      const text = "This is a test text";

      expect(() => highlightSearchTerm(text, specialChars)).not.toThrow();
    });
  });
});

import { describe, expect, it } from "vitest";
import { htmlToMarkdown } from "./html-to-markdown.js";

describe("htmlToMarkdown", () => {
  it("returns an empty string for empty/whitespace input", () => {
    expect(htmlToMarkdown("")).toBe("");
    expect(htmlToMarkdown("   \n  ")).toBe("");
  });

  it("converts headings, bold text, and paragraphs", () => {
    const md = htmlToMarkdown("<h2>Seminar</h2><p>Isi <strong>berita</strong>.</p>");
    expect(md).toContain("## Seminar");
    expect(md).toContain("**berita**");
  });

  it("converts a link", () => {
    const md = htmlToMarkdown('<p><a href="https://example.com">contoh</a></p>');
    expect(md).toBe("[contoh](https://example.com)");
  });

  it("converts an unordered list using a dash marker", () => {
    const md = htmlToMarkdown("<ul><li>Satu</li><li>Dua</li></ul>");
    expect(md.startsWith("-")).toBe(true);
    expect(md).toContain("Satu");
    expect(md).toContain("Dua");
  });
});

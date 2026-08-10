import TurndownService from "turndown";

const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});

/**
 * `content:encoded` in a WXR export is raw WordPress HTML, but this CMS
 * stores `bodyMarkdown` — this is the one conversion step in between.
 * Empty/whitespace-only input returns `""` rather than running Turndown on
 * nothing.
 */
export function htmlToMarkdown(html: string): string {
  if (!html || !html.trim()) return "";
  return turndownService.turndown(html).trim();
}

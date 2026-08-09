# UNEJ CMS Page Builder

Official visual page builder for UNEJ CMS. It enhances the existing page and
news editors with a Gutenberg-style block canvas while keeping `bodyMarkdown`
as the canonical content format.

## Design guarantees

- No database migration: content round-trips through portable Markdown and
  versioned `cms-v2` block markers.
- Theme independent: all public block styling ships as a plugin asset and is
  injected only while the plugin is active for a site.
- Safe deactivation: pages and news remain stored and editable as Markdown;
  reinstalling/reactivating restores the visual editing experience.
- Responsive and accessible output: finite style modifiers, semantic HTML,
  native `<details>` FAQ interactions, reduced-motion support, and no inline
  scripts.

## Rich blocks

Hero, Callout, Cards, Gallery, Statistics, FAQ, and Spacer complement the
standard text, media, design, table, calendar, embed, and custom HTML blocks.
The plugin also ships Landing Page, Institution Profile, and FAQ patterns.

Activate **Page Builder** from the site Plugins screen, then create or edit a
page/news item to use the visual builder.

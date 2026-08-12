import { randomUUID } from 'node:crypto';
import type { CmsTheme } from '@unej-cms/sdk-theme';
import type { PageBlock } from '@unej-cms/sdk-content';

/**
 * Materialises a theme's declared starter homepage into real page blocks
 * (docs/theme_aware_prd.md §19).
 *
 * Block ids are generated here, not by the theme: they identify a block
 * *within one page*, so two sites created from the same theme must not end up
 * sharing them.
 *
 * `title` defaults to the site name when the theme left it blank, so a fresh
 * homepage never renders an empty headline.
 */
export function buildThemeHomepageBlocks(
  theme: CmsTheme<unknown>,
  siteName: string,
): PageBlock[] {
  return (theme.defaultHomepage ?? []).map((block) => {
    const props: Record<string, unknown> = { ...block.props };
    if ('title' in props && !String(props.title ?? '').trim()) {
      props.title = siteName;
    }
    return { id: randomUUID(), type: block.type, props };
  });
}

/**
 * Whether a homepage still holds exactly what some theme would have generated
 * — i.e. nobody has edited it since it was created.
 *
 * Compared by block *type sequence* rather than by props: an untouched
 * homepage keeps the theme's structure, and that structure is what a theme
 * switch is entitled to replace. Comparing props too would treat filling in
 * the headline (the first thing any editor does) as "heavily customised" and
 * then refuse to follow the new theme at all.
 */
export function matchesThemeHomepage(
  blocks: readonly PageBlock[],
  theme: CmsTheme<unknown>,
): boolean {
  const expected = theme.defaultHomepage ?? [];
  if (blocks.length !== expected.length) return false;
  return blocks.every((block, index) => block.type === expected[index].type);
}

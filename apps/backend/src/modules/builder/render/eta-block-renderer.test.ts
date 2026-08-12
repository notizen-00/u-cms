import { describe, expect, it } from 'vitest';
import type { CmsTheme } from '@unej-cms/sdk-theme';
import type { PageBlock } from '@unej-cms/sdk-content';
import { Eta } from 'eta';
import defaultTheme from '@unej-cms/theme-default';
import premiumTheme from '@unej-cms/theme-premium';
import { BlockRegistryService } from '../../blocks/block-registry.service';
import { renderBlocks, type BlockRenderContext } from './block-content-renderer';

const DEFAULT = 'unej.theme-default';
const PREMIUM = 'unej.theme-premium';

const context: BlockRenderContext = {
  site: { name: 'Situs Uji', slug: 'uji' },
  theme: { primaryColor: '#075985' },
  menus: {},
  news: [
    { slug: 'a', title: 'Berita A', excerpt: 'Ringkasan A', categories: [{ name: 'Kampus' }], tags: [] },
    { slug: 'b', title: 'Berita B', excerpt: 'Ringkasan B', categories: [], tags: [] },
  ],
  pages: [],
};

/**
 * Proves `renderBlocks()` (block-content-renderer.ts) is genuinely
 * renderer-agnostic: the same function that drives the Svelte themes'
 * `.svelte` compilation (see block-content-renderer.test.ts) works unchanged
 * for the Eta themes' raw template strings, given an Eta-backed
 * `RenderComponent` — exactly what EtaSiteRenderer and PreviewRendererService
 * now supply.
 */
describe('renderBlocks (Eta)', () => {
  const registry = new BlockRegistryService();
  const eta = new Eta({ autoEscape: true });
  const renderComponent = async (source: string, _filename: string, props: Record<string, unknown>) => ({
    head: '',
    body: eta.renderString(source, props) as string,
  });

  const run = (blocks: PageBlock[], theme: unknown, themeId: string) =>
    renderBlocks(blocks, theme as CmsTheme<string>, themeId, registry, context, renderComponent);

  it("renders core.hero, core.text, and core.news with the default theme's own Eta templates", async () => {
    const html = await run(
      [
        { id: 'h1', type: 'core.hero', props: { title: 'Judul Hero' } },
        { id: 't1', type: 'core.text', props: { content: '<p>isi</p>' } },
        { id: 'n1', type: 'core.news', props: { title: 'Kabar', limit: 1 } },
      ],
      defaultTheme,
      DEFAULT,
    );

    expect(html).toContain('Judul Hero');
    expect(html).toContain('<p>isi</p>');
    expect(html).toContain('Kabar');
    expect(html).toContain('Berita A');
    expect(html).not.toContain('Berita B');
  });

  it("renders the same core.hero block with each Eta theme's own markup", async () => {
    const block: PageBlock[] = [{ id: 'h1', type: 'core.hero', props: { title: 'Sama' } }];

    const usingDefault = await run(block, defaultTheme, DEFAULT);
    const usingPremium = await run(block, premiumTheme, PREMIUM);

    expect(usingDefault).toContain('Sama');
    expect(usingPremium).toContain('Sama');
    // Premium draws a hero inside its own `.hero` shell; default's is plain
    // and uses `.blk-hero` instead — proof the two aren't sharing markup.
    expect(usingPremium).toContain('class="hero');
    expect(usingDefault).toContain('class="wrap blk-hero');
  });

  it('falls back to core.hero when a page authored under Joy renders under an Eta theme', async () => {
    // Joy's `joy.image-hero` declares `fallback: "core.hero"` (docs/theme_
    // aware_prd.md §13) — an Eta theme has no renderer for the Joy-specific
    // type, but does for the core one, so the fallback chain is what keeps
    // the section visible after a switch from Joy to a plain Eta theme.
    const html = await run(
      [{ id: 'h1', type: 'joy.image-hero', props: { title: 'Tetap Tampil' } }],
      defaultTheme,
      DEFAULT,
    );

    expect(html).toContain('Tetap Tampil');
    expect(html).toContain('blk-hero');
  });

  it('skips a block neither the theme nor its fallback chain can draw', async () => {
    const html = await run(
      [
        { id: 'm1', type: 'joy.mega-menu', props: { menu: 'primary' } },
        { id: 't1', type: 'core.text', props: { content: '<p>tetap ada</p>' } },
      ],
      premiumTheme,
      PREMIUM,
    );

    expect(html).toContain('tetap ada');
    expect(html).not.toContain('mega-menu');
  });
});

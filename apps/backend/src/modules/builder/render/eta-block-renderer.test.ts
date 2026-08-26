import { describe, expect, it } from 'vitest';
import type { CmsTheme } from '@unej-cms/sdk-theme';
import type { PageBlock } from '@unej-cms/sdk-content';
import { Eta } from 'eta';
import { BlockRegistryService } from '../../blocks/block-registry.service';
import { renderBlocks, type BlockRenderContext } from './block-content-renderer';

/**
 * Two minimal, inline Eta-flavoured theme fixtures — not real installed
 * themes (no installed theme currently declares `renderKind: 'eta'`; see
 * theme-registry.ts's INSTALLED_THEMES). `renderBlocks()` only ever reads
 * `theme.blockRenderers` off whatever object it's handed, so a real
 * `defineTheme()` isn't needed to prove it's genuinely renderer-agnostic —
 * only two Eta template sets whose markup is deliberately distinguishable
 * from each other. Both fixture theme ids are arbitrary, unregistered
 * strings: `BlockRegistryService.resolveFallback()` (the only place a
 * `themeId` matters here) falls back to CORE_BLOCKS for an unknown id, which
 * is all these tests' fallback-chain assertions need — `core.hero` is a real
 * core block regardless of which theme id is passed.
 */
const DEFAULT = 'test.theme-a';
const PREMIUM = 'test.theme-b';

const themeA = {
  blockRenderers: {
    'core.hero': '<div class="wrap blk-hero"><h1><%= it.props.title %></h1></div>',
    'core.text': '<div class="blk-text"><%~ it.props.content %></div>',
    'core.news':
      '<div class="blk-news"><h2><%= it.props.title %></h2><% (it.news || []).slice(0, it.props.limit).forEach(function(item) { %><span><%= item.title %></span><% }) %></div>',
  },
};

const themeB = {
  blockRenderers: {
    'core.hero': '<section class="hero"><h1><%= it.props.title %></h1></section>',
    'core.text': '<div class="blk-text"><%~ it.props.content %></div>',
  },
};

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

  const run = async (blocks: PageBlock[], theme: unknown, themeId: string) => {
    const result = await renderBlocks(blocks, theme as CmsTheme<string>, themeId, registry, context, renderComponent);
    return result.body;
  };

  it("renders core.hero, core.text, and core.news with an Eta theme's own templates", async () => {
    const html = await run(
      [
        { id: 'h1', type: 'core.hero', props: { title: 'Judul Hero' } },
        { id: 't1', type: 'core.text', props: { content: '<p>isi</p>' } },
        { id: 'n1', type: 'core.news', props: { title: 'Kabar', limit: 1 } },
      ],
      themeA,
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

    const usingThemeA = await run(block, themeA, DEFAULT);
    const usingThemeB = await run(block, themeB, PREMIUM);

    expect(usingThemeA).toContain('Sama');
    expect(usingThemeB).toContain('Sama');
    // Theme B draws a hero inside its own `.hero` shell; theme A's is plain
    // and uses `.blk-hero` instead — proof the two aren't sharing markup.
    expect(usingThemeB).toContain('class="hero');
    expect(usingThemeA).toContain('class="wrap blk-hero');
  });

  it('falls back to core.hero when a page authored under Joy renders under an Eta theme', async () => {
    // Joy's `joy.image-hero` declares `fallback: "core.hero"` (docs/theme_
    // aware_prd.md §13) — an Eta theme has no renderer for the Joy-specific
    // type, but does for the core one, so the fallback chain is what keeps
    // the section visible after a switch from Joy to a plain Eta theme.
    const html = await run(
      [{ id: 'h1', type: 'joy.image-hero', props: { title: 'Tetap Tampil' } }],
      themeA,
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
      themeB,
      PREMIUM,
    );

    expect(html).toContain('tetap ada');
    expect(html).not.toContain('mega-menu');
  });
});

import { beforeAll, describe, expect, it } from 'vitest';
import type { CmsTheme } from '@unej-cms/sdk-theme';
import type { PageBlock } from '@unej-cms/sdk-content';
import facultyTheme from '@unej-cms/theme-faculty';
import joyTheme from '@unej-cms/theme-joy';
import { BlockRegistryService } from '../../blocks/block-registry.service';
import { renderBlocks, type BlockRenderContext } from './block-content-renderer';

const FACULTY = 'unej.theme-faculty';
const JOY = 'unej.theme-joy';

const context: BlockRenderContext = {
  site: { name: 'Situs Uji', slug: 'uji' },
  theme: { primaryColor: '#7c3aed' },
  menus: {},
  news: [
    { slug: 'a', title: 'Berita A', excerpt: 'Ringkasan A', categories: [{ name: 'Kampus' }], tags: [] },
    { slug: 'b', title: 'Berita B', excerpt: 'Ringkasan B', categories: [], tags: [] },
  ],
  pages: [],
};

/** Compiles the theme's real `.svelte` source through Svelte's SSR compiler, exactly as the site build does. */
async function makeRenderComponent() {
  const { compile } = await import('svelte/compiler');
  const { render } = await import('svelte/server');
  const { mkdir, writeFile } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const { pathToFileURL } = await import('node:url');

  const cacheDir = join(__dirname, '..', '..', '..', '..', '.svelte-cache');
  await mkdir(cacheDir, { recursive: true });

  return async (source: string, filename: string, props: Record<string, unknown>) => {
    const { js } = compile(source, { generate: 'server', filename });
    const file = join(cacheDir, `spec-${Date.now()}-${Math.random().toString(36).slice(2)}.mjs`);
    await writeFile(file, js.code, 'utf-8');
    const mod = (await import(pathToFileURL(file).href)) as { default: unknown };
    const renderComponent = render as unknown as (
      component: unknown,
      options: { props: Record<string, unknown> },
    ) => { head: string; body: string };
    return renderComponent(mod.default, { props });
  };
}

describe('renderBlocks', () => {
  const registry = new BlockRegistryService();
  let renderComponent: Awaited<ReturnType<typeof makeRenderComponent>>;

  beforeAll(async () => {
    renderComponent = await makeRenderComponent();
  });

  const run = (blocks: PageBlock[], theme: unknown, themeId: string) =>
    renderBlocks(blocks, theme as CmsTheme<string>, themeId, registry, context, renderComponent);

  it("renders a theme block with that theme's own markup", async () => {
    const html = await run(
      [
        {
          id: 'h1',
          type: 'faculty.video-hero',
          props: { title: 'Judul Hero', subtitle: 'Deskripsi', video: 'https://x.test/v.mp4' },
        },
      ],
      facultyTheme,
      FACULTY,
    );

    // Faculty's own hero classes — not generic builder markup.
    expect(html).toContain('class="hero"');
    expect(html).toContain('hero-video');
    expect(html).toContain('https://x.test/v.mp4');
    expect(html).toContain('Judul Hero');
  });

  it('renders the same core block differently under each theme', async () => {
    const block: PageBlock[] = [{ id: 'h1', type: 'core.hero', props: { title: 'Sama' } }];

    const faculty = await run(block, facultyTheme, FACULTY);
    const joy = await run(block, joyTheme, JOY);

    expect(faculty).toContain('Sama');
    expect(joy).toContain('Sama');
    // Faculty draws a hero with a media layer; Joy uses its badge/tagline hero.
    expect(faculty).toContain('hero-media');
    expect(joy).not.toContain('hero-media');
    expect(joy).toContain('hero-title');
  });

  it('falls back to the core renderer when the theme lacks the block', async () => {
    // Authored under Faculty, rendered under Joy: joy has no
    // `faculty.video-hero` renderer, so its `core.hero` fallback stands in
    // rather than the section disappearing.
    const html = await run(
      [{ id: 'h1', type: 'faculty.video-hero', props: { title: 'Tetap Tampil' } }],
      joyTheme,
      JOY,
    );

    expect(html).toContain('Tetap Tampil');
    expect(html).toContain('hero-title');
  });

  it('pulls live data into dynamic blocks instead of stored props', async () => {
    const html = await run(
      [{ id: 'n1', type: 'core.news', props: { title: 'Kabar', limit: 1 } }],
      joyTheme,
      JOY,
    );

    expect(html).toContain('Kabar');
    // `limit: 1` — the first news item renders, the second does not.
    expect(html).toContain('Berita A');
    expect(html).not.toContain('Berita B');
  });

  it('skips a block no renderer and no fallback can draw', async () => {
    const html = await run(
      [
        { id: 'm1', type: 'joy.mega-menu', props: { menu: 'primary' } },
        { id: 't1', type: 'core.text', props: { content: '<p>tetap ada</p>' } },
      ],
      facultyTheme,
      FACULTY,
    );

    // The unrenderable block is dropped from the output, but never takes the
    // rest of the page down with it.
    expect(html).toContain('tetap ada');
    expect(html).not.toContain('mega-menu');
  });
});

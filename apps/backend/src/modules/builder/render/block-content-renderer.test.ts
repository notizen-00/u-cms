import { beforeAll, describe, expect, it } from 'vitest';
import type { CmsTheme } from '@unej-cms/sdk-theme';
import type { PageBlock } from '@unej-cms/sdk-content';
import facultyTheme from '@unej-cms/theme-faculty';
import joyTheme from '@unej-cms/theme-joy';
import { BlockRegistryService } from '../../blocks/block-registry.service';
import { renderBlocks, type BlockRenderContext } from './block-content-renderer';

const FACULTY = 'unej.theme-faculty';
const JOY = 'unej.theme-joy';
/**
 * Not a real installed theme — a plain `{ blockRenderers: {} }` stand-in for
 * "a theme that draws nothing itself for this block," which no currently
 * installed theme's own props naturally exhibit (alpha/faculty/joy all
 * declare real renderers). This is arguably a more precise fixture for that
 * scenario than depending on some real theme happening to have none.
 */
const BLANK_THEME = { blockRenderers: {} };
const BLANK = 'test.theme-blank';

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

  const run = async (blocks: PageBlock[], theme: unknown, themeId: string, editable = false) => {
    const result = await renderBlocks(blocks, theme as CmsTheme<string>, themeId, registry, context, renderComponent, editable);
    return result.body;
  };

  it('emits no fallback styles when every block is theme-rendered', async () => {
    const result = await renderBlocks(
      [{ id: 'h1', type: 'core.hero', props: { title: 'Judul' } }],
      joyTheme as CmsTheme<string>,
      JOY,
      registry,
      context,
      renderComponent,
    );
    expect(result.styles).toBe('');
  });

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

  it('wraps each block in a data-cms-block-id marker when editable is true', async () => {
    const html = await run(
      [{ id: 'h1', type: 'core.hero', props: { title: 'Judul' } }],
      joyTheme,
      JOY,
      true,
    );

    expect(html).toContain('data-cms-block-id="h1"');
    expect(html).toContain('data-cms-block-type="core.hero"');
  });

  it('marks a fallback-rendered block with its resolved type, not its stored type', async () => {
    const html = await run(
      [{ id: 'h1', type: 'faculty.video-hero', props: { title: 'Judul' } }],
      joyTheme,
      JOY,
      true,
    );

    expect(html).toContain('data-cms-block-id="h1"');
    expect(html).toContain('data-cms-block-type="core.hero"');
  });

  it('emits no markers when editable is omitted (production default)', async () => {
    const html = await run([{ id: 'h1', type: 'core.hero', props: { title: 'Judul' } }], joyTheme, JOY);

    expect(html).not.toContain('data-cms-block-id');
  });
});

describe('renderBlocks (generic core fallback)', () => {
  // Neither Joy nor Faculty declares a `blockRenderers` entry for these core
  // types (both only implement core.hero/core.text/core.news) — this is
  // exactly the "add a plain core.* block, nothing shows up" bug: the CMS's
  // own generic fallback is what's expected to render it instead of the
  // block silently vanishing.
  const registry = new BlockRegistryService();
  const renderComponent = async (): Promise<{ head: string; body: string }> => {
    throw new Error('theme renderer should not be invoked for a core-fallback block');
  };
  const run = async (blocks: PageBlock[], theme: unknown, themeId: string) => {
    const result = await renderBlocks(blocks, theme as CmsTheme<string>, themeId, registry, context, renderComponent);
    return result.body;
  };

  it('renders core.image generically when the theme has no renderer for it', async () => {
    const html = await run(
      [{ id: 'i1', type: 'core.image', props: { src: 'https://x.test/a.jpg', alt: 'Deskripsi' } }],
      joyTheme,
      JOY,
    );

    expect(html).toContain('src="https://x.test/a.jpg"');
    expect(html).toContain('alt="Deskripsi"');
    expect(html).toContain('cms-block-image');
  });

  it('returns the shared fallback stylesheet once, not per block, in `styles`', async () => {
    const result = await renderBlocks(
      [
        { id: 'i1', type: 'core.image', props: { src: 'https://x.test/a.jpg' } },
        { id: 'i2', type: 'core.image', props: { src: 'https://x.test/b.jpg' } },
      ],
      joyTheme as CmsTheme<string>,
      JOY,
      registry,
      context,
      renderComponent,
    );

    expect(result.styles).toContain('.cms-block-image');
    expect(result.styles).toContain('--cms-block-accent:#7c3aed'); // context's theme.primaryColor
    // One stylesheet, not one concatenated per block — the `:root` variable
    // declaration is the giveaway, since only the sheet itself repeats it.
    expect(result.styles.match(/:root\{--cms-block-accent/g)).toHaveLength(1);
  });

  it('renders core.button and core.gallery generically', async () => {
    const html = await run(
      [
        { id: 'b1', type: 'core.button', props: { label: 'Daftar', url: '/daftar' } },
        {
          id: 'g1',
          type: 'core.gallery',
          props: { images: [{ url: 'https://x.test/1.jpg' }, { url: 'https://x.test/2.jpg' }] },
        },
      ],
      facultyTheme,
      FACULTY,
    );

    expect(html).toContain('Daftar');
    expect(html).toContain('href="/daftar"');
    expect(html).toContain('https://x.test/1.jpg');
    expect(html).toContain('https://x.test/2.jpg');
  });

  it('still skips core.columns (no slot-editing UI to populate it yet)', async () => {
    const html = await run([{ id: 'c1', type: 'core.columns', props: { count: 2 } }], joyTheme, JOY);

    expect(html).toBe('');
  });

  it('falls back through a foreign theme block to the generic core renderer when the active theme draws nothing at all', async () => {
    // BLANK_THEME declares no `blockRenderers` whatsoever — not even for
    // core.hero — so a page authored under Faculty (`faculty.video-hero`,
    // fallback: core.hero) switched to a theme like this has no theme
    // component to reach for at any point in the chain. The generic fallback
    // is what keeps the section visible.
    const html = await run(
      [{ id: 'h1', type: 'faculty.video-hero', props: { title: 'Tetap Tampil' } }],
      BLANK_THEME,
      BLANK,
    );

    expect(html).toContain('Tetap Tampil');
  });
});

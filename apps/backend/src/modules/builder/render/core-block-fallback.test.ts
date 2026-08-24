import { describe, expect, it } from 'vitest';
import { buildCoreBlockFallbackStyles, renderCoreBlockFallback } from './core-block-fallback';

const context = {
  site: { name: 'Situs Uji' },
  theme: { primaryColor: '#7c3aed' },
  news: [
    { slug: 'a', title: 'Berita A', excerpt: 'Ringkasan A', categories: [{ name: 'Kampus' }] },
    { slug: 'b', title: 'Berita B', excerpt: 'Ringkasan B', categories: [] },
  ],
};

describe('renderCoreBlockFallback', () => {
  it('returns undefined for a non-core type', () => {
    expect(renderCoreBlockFallback('faculty.video-hero', {}, context)).toBeUndefined();
  });

  it('returns undefined for core.columns (no slot-editing UI to populate it yet)', () => {
    expect(renderCoreBlockFallback('core.columns', { count: 2 }, context)).toBeUndefined();
  });

  it('renders core.hero, falling back to the site name when no title is set', () => {
    const withTitle = renderCoreBlockFallback('core.hero', { title: 'Judul', eyebrow: 'Info' }, context);
    expect(withTitle).toContain('Judul');
    expect(withTitle).toContain('Info');

    const withoutTitle = renderCoreBlockFallback('core.hero', {}, context);
    expect(withoutTitle).toContain('Situs Uji');
  });

  it('escapes untrusted attribute values in core.hero', () => {
    const html = renderCoreBlockFallback('core.hero', { title: '<script>x</script>', image: '"onerror=alert(1)' }, context);
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('renders core.text raw (already-sanitized richtext), unescaped', () => {
    const html = renderCoreBlockFallback('core.text', { content: '<p>Isi <strong>kaya</strong></p>' }, context);
    expect(html).toContain('<p>Isi <strong>kaya</strong></p>');
  });

  it('renders core.image only when src is set', () => {
    expect(renderCoreBlockFallback('core.image', {}, context)).toBe('');
    const html = renderCoreBlockFallback('core.image', { src: 'https://x.test/a.jpg', alt: 'Alt', caption: 'Ket' }, context);
    expect(html).toContain('src="https://x.test/a.jpg"');
    expect(html).toContain('alt="Alt"');
    expect(html).toContain('Ket');
  });

  it('renders core.video with sane default attributes', () => {
    const html = renderCoreBlockFallback('core.video', { src: 'https://x.test/v.mp4' }, context);
    expect(html).toContain('src="https://x.test/v.mp4"');
    expect(html).toContain('controls');
    expect(html).toContain('muted');
    expect(html).not.toContain('autoplay');
  });

  it('renders core.button only when both label and url are set', () => {
    expect(renderCoreBlockFallback('core.button', { label: 'Daftar' }, context)).toBe('');
    const html = renderCoreBlockFallback('core.button', { label: 'Daftar', url: '/daftar' }, context);
    expect(html).toContain('href="/daftar"');
    expect(html).toContain('Daftar');
  });

  it('renders core.search with default placeholder and action', () => {
    const html = renderCoreBlockFallback('core.search', {}, context);
    expect(html).toContain('Cari informasi...');
    expect(html).toContain('action="/news/"');
  });

  it('renders core.news filtered by category and limited to `limit`', () => {
    const all = renderCoreBlockFallback('core.news', { limit: 6, category: '' }, context)!;
    expect(all).toContain('Berita A');
    expect(all).toContain('Berita B');

    const filtered = renderCoreBlockFallback('core.news', { limit: 6, category: 'kampus' }, context)!;
    expect(filtered).toContain('Berita A');
    expect(filtered).not.toContain('Berita B');

    const empty = renderCoreBlockFallback('core.news', { limit: 6, category: '' }, { ...context, news: [] })!;
    expect(empty).toContain('Belum ada berita.');
  });

  it('renders core.events as an empty state (no agenda data model exists yet)', () => {
    const html = renderCoreBlockFallback('core.events', { title: 'Agenda Kampus' }, context)!;
    expect(html).toContain('Agenda Kampus');
    expect(html).toContain('Belum ada agenda.');
  });

  it('renders core.gallery only when it has images, respecting the column count', () => {
    expect(renderCoreBlockFallback('core.gallery', { images: [] }, context)).toBe('');

    const html = renderCoreBlockFallback(
      'core.gallery',
      { title: 'Galeri', columns: 5, images: [{ url: 'https://x.test/1.jpg' }, { url: 'https://x.test/2.jpg', caption: 'Ket' }] },
      context,
    )!;
    expect(html).toContain('Galeri');
    expect(html).toContain('https://x.test/1.jpg');
    expect(html).toContain('https://x.test/2.jpg');
    expect(html).toContain('Ket');
    // Clamped to the documented 2-4 range even though 5 was requested.
    expect(html).toContain('cms-block-gallery__grid--cols-4');
    expect(html).not.toContain('cms-block-gallery__grid--cols-5');
  });

  it('never emits an inline style= attribute — only cms-block-* classes', () => {
    const withEverything = [
      renderCoreBlockFallback('core.hero', { title: 'Judul', eyebrow: 'Info', image: 'https://x.test/bg.jpg', ctaLabel: 'Mulai', ctaUrl: '/mulai', align: 'center' }, context),
      renderCoreBlockFallback('core.text', { content: '<p>x</p>' }, context),
      renderCoreBlockFallback('core.image', { src: 'https://x.test/a.jpg' }, context),
      renderCoreBlockFallback('core.video', { src: 'https://x.test/v.mp4' }, context),
      renderCoreBlockFallback('core.button', { label: 'Daftar', url: '/daftar', variant: 'outline' }, context),
      renderCoreBlockFallback('core.search', {}, context),
      renderCoreBlockFallback('core.news', { limit: 6 }, context),
      renderCoreBlockFallback('core.events', {}, context),
      renderCoreBlockFallback('core.gallery', { images: [{ url: 'https://x.test/1.jpg' }] }, context),
    ].join('');

    expect(withEverything).not.toContain('style=');
    expect(withEverything).toContain('cms-block-hero--image');
    expect(withEverything).toContain('cms-block-hero--center');
    expect(withEverything).toContain('cms-block-btn--outline');
  });
});

describe('buildCoreBlockFallbackStyles', () => {
  it('embeds the given accent color as a CSS custom property', () => {
    const css = buildCoreBlockFallbackStyles('#7c3aed');
    expect(css).toContain('--cms-block-accent:#7c3aed');
    expect(css).toContain('.cms-block-btn{');
    expect(css).toContain('.cms-block-hero{');
    expect(css).toContain('.cms-block-gallery__grid--cols-4{');
  });

  it('falls back to the default color instead of letting an unsafe value break out of the declaration', () => {
    const css = buildCoreBlockFallbackStyles('red; } body { display:none } /*');
    expect(css).toContain('--cms-block-accent:#075985');
    expect(css).not.toContain('display:none');
  });

  it('still accepts rgb()/hsl() color functions', () => {
    const css = buildCoreBlockFallbackStyles('rgb(124, 58, 237)');
    expect(css).toContain('--cms-block-accent:rgb(124, 58, 237)');
  });
});

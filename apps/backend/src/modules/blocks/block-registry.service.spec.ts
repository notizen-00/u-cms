import { BlockRegistryService } from './block-registry.service';

const FACULTY = 'unej.theme-faculty';
const JOY = 'unej.theme-joy';
const DEFAULT = 'unej.theme-default';

describe('BlockRegistryService', () => {
  const registry = new BlockRegistryService();

  const typesFor = (themeId: string) =>
    registry.listForTheme(themeId).map(({ definition }) => String(definition.id));

  it('exposes the core catalog to every theme', () => {
    for (const themeId of [FACULTY, JOY, DEFAULT]) {
      expect(typesFor(themeId)).toEqual(expect.arrayContaining(['core.hero', 'core.news', 'core.text']));
    }
  });

  it('adds only the active theme\'s own blocks', () => {
    expect(typesFor(FACULTY)).toEqual(expect.arrayContaining(['faculty.video-hero', 'faculty.academic-search']));
    expect(typesFor(FACULTY)).not.toContain('joy.image-hero');

    expect(typesFor(JOY)).toEqual(expect.arrayContaining(['joy.image-hero', 'joy.mega-menu']));
    expect(typesFor(JOY)).not.toContain('faculty.video-hero');
  });

  it('labels where each block came from, for the picker\'s grouping', () => {
    const bySource = registry.listForTheme(FACULTY);
    expect(bySource.find(({ definition }) => String(definition.id) === 'core.hero')?.source).toBe('core');
    expect(bySource.find(({ definition }) => String(definition.id) === 'faculty.video-hero')?.source).toBe('theme');
  });

  it('reports a theme block as unsupported under a different theme', () => {
    expect(registry.isSupported(FACULTY, 'faculty.video-hero')).toBe(true);
    expect(registry.isSupported(JOY, 'faculty.video-hero')).toBe(false);
  });

  it('resolves an unsupported block to its declared core fallback', () => {
    // Authored under Faculty, now viewed under Joy: the section must survive.
    expect(registry.resolveFallback(JOY, 'faculty.video-hero')?.id).toBe('core.hero');
    expect(registry.resolveFallback(DEFAULT, 'joy.announcement')?.id).toBe('core.text');
  });

  it('returns the block itself when the theme already supports it', () => {
    expect(registry.resolveFallback(FACULTY, 'faculty.video-hero')?.id).toBe('faculty.video-hero');
  });

  it('returns null when nothing can stand in', () => {
    // joy.mega-menu deliberately declares no fallback — it renders a CMS menu
    // resource, which no core content block can represent.
    expect(registry.resolveFallback(FACULTY, 'joy.mega-menu')).toBeNull();
    expect(registry.resolveFallback(FACULTY, 'does.not-exist')).toBeNull();
  });

  it('summarises a page\'s blocks against a candidate theme', () => {
    const report = registry.checkCompatibility(JOY, [
      'core.news',
      'faculty.video-hero',
      'core.news',
    ]);

    // Deduped, so a page repeating a block type reports it once.
    expect(report).toHaveLength(2);
    expect(report).toEqual(
      expect.arrayContaining([
        { type: 'core.news', supported: true, fallback: null },
        { type: 'faculty.video-hero', supported: false, fallback: 'core.hero' },
      ]),
    );
  });
});

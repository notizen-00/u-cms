import type { CmsTheme } from '@unej-cms/sdk-theme';
import type { PageBlock } from '@unej-cms/sdk-content';
import facultyTheme from '@unej-cms/theme-faculty';
import joyTheme from '@unej-cms/theme-joy';
import defaultTheme from '@unej-cms/theme-default';
import { buildThemeHomepageBlocks, matchesThemeHomepage } from './homepage-blocks';

const joy = joyTheme as CmsTheme<unknown>;
const faculty = facultyTheme as CmsTheme<unknown>;

describe('buildThemeHomepageBlocks', () => {
  it("materialises the theme's declared starter homepage", () => {
    const blocks = buildThemeHomepageBlocks(joy, 'Situs Uji');

    expect(blocks.map((block) => block.type)).toEqual([
      'joy.image-hero',
      'core.news',
      'joy.announcement',
    ]);
  });

  it('produces a different homepage per theme', () => {
    const joyTypes = buildThemeHomepageBlocks(joy, 'X').map((b) => b.type);
    const facultyTypes = buildThemeHomepageBlocks(faculty, 'X').map((b) => b.type);

    expect(facultyTypes).toEqual([
      'faculty.video-hero',
      'faculty.academic-search',
      'core.news',
    ]);
    expect(facultyTypes).not.toEqual(joyTypes);
  });

  it('gives every block a unique id, never shared between sites', () => {
    const first = buildThemeHomepageBlocks(joy, 'Situs A');
    const second = buildThemeHomepageBlocks(joy, 'Situs B');
    const ids = [...first, ...second].map((block) => block.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('falls back to the site name for a blank title', () => {
    const [hero] = buildThemeHomepageBlocks(joy, 'Fakultas Uji');
    expect(hero.props.title).toBe('Fakultas Uji');
  });

  it('returns nothing for a theme that declares no starter homepage', () => {
    // Eta themes have no block renderers, so seeding blocks would render blank.
    expect(buildThemeHomepageBlocks(defaultTheme as CmsTheme<unknown>, 'X')).toEqual([]);
  });
});

describe('matchesThemeHomepage', () => {
  const starter = buildThemeHomepageBlocks(joy, 'Situs Uji');

  it('recognises an untouched starter homepage', () => {
    expect(matchesThemeHomepage(starter, joy)).toBe(true);
  });

  it('still recognises it after the copy was filled in', () => {
    // Editing text is the first thing anyone does; it must not count as
    // "restructured", or a theme switch would never refresh the homepage.
    const edited: PageBlock[] = starter.map((block) => ({
      ...block,
      props: { ...block.props, title: 'Judul Baru' },
    }));

    expect(matchesThemeHomepage(edited, joy)).toBe(true);
  });

  it('treats a reordered or extended homepage as the author\'s own', () => {
    const extra: PageBlock[] = [
      ...starter,
      { id: 'x', type: 'core.text', props: { content: '<p>tambahan</p>' } },
    ];
    const reordered = [starter[1], starter[0], starter[2]];

    expect(matchesThemeHomepage(extra, joy)).toBe(false);
    expect(matchesThemeHomepage(reordered, joy)).toBe(false);
  });

  it("does not mistake one theme's starter for another's", () => {
    expect(matchesThemeHomepage(starter, faculty)).toBe(false);
  });
});

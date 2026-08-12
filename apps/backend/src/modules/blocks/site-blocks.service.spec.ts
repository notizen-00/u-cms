import type { PageBlock } from '@unej-cms/sdk-content';
import type { DrizzleDb } from '../../database/database.types';
import { BlockRegistryService } from './block-registry.service';
import { SiteBlocksService } from './site-blocks.service';

const SITE = 'site-1';
const JOY = 'unej.theme-joy';
const FACULTY = 'unej.theme-faculty';

interface FakePage {
  id: string;
  title: string;
  slug: string;
  blocks: PageBlock[];
  isHomepage: boolean;
}

/**
 * `scanSite` issues three reads in a fixed order — the site row (for its
 * active theme), its active plugin slugs, then its pages — so the fake
 * answers them in that order.
 */
function createDb(pagesRows: FakePage[]): DrizzleDb {
  const responses: unknown[][] = [[{ themeId: FACULTY }], [], pagesRows];
  let call = 0;

  const select = jest.fn().mockImplementation(() => {
    const rows = responses[Math.min(call, responses.length - 1)];
    call += 1;
    const where = jest.fn().mockReturnValue({
      limit: jest.fn().mockResolvedValue(rows),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(rows).then(resolve),
    });
    return { from: jest.fn().mockReturnValue({ where }) };
  });

  return { select } as unknown as DrizzleDb;
}

function page(id: string, blocks: PageBlock[], isHomepage = false): FakePage {
  return { id, title: `Halaman ${id}`, slug: id, blocks, isHomepage };
}

function block(type: string): PageBlock {
  return { id: `${type}-1`, type, props: {} };
}

describe('SiteBlocksService.scanSite', () => {
  const registry = new BlockRegistryService();

  it('counts a page with only supported blocks as compatible', async () => {
    const db = createDb([page('a', [block('core.hero'), block('core.news')])]);
    const service = new SiteBlocksService(db, registry);

    const report = await service.scanSite(SITE, JOY);

    expect(report).toMatchObject({ themeId: JOY, scanned: 1, compatible: 1 });
    expect(report.affected).toHaveLength(0);
  });

  it('flags pages using another theme\'s blocks, with their fallback', async () => {
    const db = createDb([
      page('a', [block('core.hero')]),
      page('b', [block('faculty.video-hero')], true),
    ]);
    const service = new SiteBlocksService(db, registry);

    const report = await service.scanSite(SITE, JOY);

    expect(report).toMatchObject({ scanned: 2, compatible: 1 });
    expect(report.affected).toHaveLength(1);
    expect(report.affected[0]).toMatchObject({ pageId: 'b', isHomepage: true });
    expect(report.affected[0].unsupported).toEqual([
      { type: 'faculty.video-hero', supported: false, fallback: 'core.hero' },
    ]);
  });

  it('reports a null fallback when nothing can stand in', async () => {
    // joy.mega-menu renders a CMS menu resource, so no content block replaces it.
    const db = createDb([page('a', [block('joy.mega-menu')])]);
    const service = new SiteBlocksService(db, registry);

    const report = await service.scanSite(SITE, FACULTY);

    expect(report.affected[0].unsupported).toEqual([
      { type: 'joy.mega-menu', supported: false, fallback: null },
    ]);
  });

  it('treats Markdown-only pages as compatible with every theme', async () => {
    // No structured blocks means nothing a theme could fail to provide.
    const db = createDb([page('a', []), page('b', [])]);
    const service = new SiteBlocksService(db, registry);

    const report = await service.scanSite(SITE, JOY);

    expect(report).toMatchObject({ scanned: 2, compatible: 2 });
    expect(report.affected).toHaveLength(0);
  });
});

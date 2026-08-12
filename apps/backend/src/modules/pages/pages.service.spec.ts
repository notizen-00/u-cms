import type { DrizzleDb } from '../../database/database.types';
import type { BuildProducer } from '../builder/queue/build.producer';
import { PagesService } from './pages.service';

const SITE = 'site-1';
const PAGE = 'page-1';

/**
 * `publishBlocks` reads the page (draft `blocks`) then writes it back as
 * `publishedBlocks` — so the fake needs to answer a `select` before the
 * `update`, and remember what the update was called with.
 */
function createDb(draftBlocks: unknown[]) {
  const page = { id: PAGE, siteId: SITE, blocks: draftBlocks, publishedBlocks: [] as unknown[] };

  const select = jest.fn().mockReturnValue({
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue([page]),
      }),
    }),
  });

  let lastSet: Record<string, unknown> | undefined;
  const update = jest.fn().mockImplementation(() => ({
    set: jest.fn().mockImplementation((values: Record<string, unknown>) => {
      lastSet = values;
      return {
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ ...page, ...values }]),
        }),
      };
    }),
  }));

  return { db: { select, update } as unknown as DrizzleDb, getLastSet: () => lastSet };
}

function createService(draftBlocks: unknown[], enqueue = jest.fn().mockResolvedValue(undefined)) {
  const { db, getLastSet } = createDb(draftBlocks);
  const service = new PagesService(db, { enqueue } as unknown as BuildProducer);
  return { service, enqueue, getLastSet };
}

describe('PagesService.publishBlocks', () => {
  it('snapshots the draft blocks into publishedBlocks', async () => {
    const draft = [{ id: 'b1', type: 'core.hero', props: { title: 'Judul' } }];
    const { service, getLastSet } = createService(draft);

    await service.publishBlocks(SITE, PAGE);

    expect(getLastSet()).toMatchObject({ publishedBlocks: draft, status: 'published' });
  });

  it('triggers a rebuild so the snapshot actually reaches the live site', async () => {
    const { service, enqueue } = createService([]);

    await service.publishBlocks(SITE, PAGE);

    expect(enqueue).toHaveBeenCalledWith(SITE);
  });

  it('marks the page published even when publishing an empty draft', async () => {
    // A page that has never had blocks (Markdown-only) still needs `status`
    // to flip if this is its first publish — publishBlocks must not skip
    // that just because there is nothing to snapshot.
    const { service, getLastSet } = createService([]);

    await service.publishBlocks(SITE, PAGE);

    expect(getLastSet()).toMatchObject({ publishedBlocks: [], status: 'published' });
  });
});

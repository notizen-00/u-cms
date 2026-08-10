import type { Job } from 'bullmq';
import { WordpressImportProcessor } from './wordpress-import.processor';
import type { WordpressImportJobData } from './wordpress-import.producer';

jest.mock('image-size', () => ({
  imageSize: jest.fn(() => ({ width: 100, height: 50 })),
}));

const parseWxrMock = jest.fn();
jest.mock('@unej-cms/plugin-wordpress-import', () => ({
  parseWxr: (xml: string) => parseWxrMock(xml),
  htmlToMarkdown: (html: string) => `md:${html}`,
}));

const PARSED_EXPORT = {
  categories: [{ wpId: 5, name: 'Berita', slug: 'berita' }],
  tags: [{ wpId: 12, name: 'Riset', slug: 'riset' }],
  attachments: [
    { wpId: 456, guid: 'guid-456', title: 'logo.jpg', sourceUrl: 'http://old.example.test/logo.jpg' },
  ],
  pages: [
    {
      wpId: 10,
      guid: 'guid-10',
      title: 'Tentang Kami',
      slug: 'tentang-kami',
      status: 'published',
      contentHtml: '<p>Tentang</p>',
      publishedAt: undefined,
      parentWpId: undefined,
    },
  ],
  posts: [
    {
      wpId: 123,
      guid: 'guid-123',
      title: 'Seminar',
      slug: 'seminar',
      status: 'published',
      contentHtml: '<p>Isi</p>',
      excerptHtml: 'Ringkasan',
      publishedAt: undefined,
      categoryWpIds: [5],
      tagWpIds: [12],
      thumbnailWpId: 456,
    },
  ],
};

/** A minimal Drizzle-shaped fake: `.select()` resolves from a queue of canned rows (one entry per call, in call order); `.insert()` records what was inserted and returns a generated row; `.update()` just resolves. */
function createDbHarness(selectResults: unknown[][]) {
  let selectCallIndex = 0;
  const inserted: { table: unknown; values: Record<string, unknown> }[] = [];
  const updated: { table: unknown; set: Record<string, unknown> }[] = [];

  const select = jest.fn(() => ({
    from: () => ({
      where: () => ({
        limit: () => Promise.resolve(selectResults[selectCallIndex++] ?? []),
      }),
    }),
  }));

  const insert = jest.fn((table: unknown) => ({
    values: (values: Record<string, unknown> | Record<string, unknown>[]) => {
      const rows = Array.isArray(values) ? values : [values];
      for (const row of rows) inserted.push({ table, values: row });
      return {
        returning: () =>
          Promise.resolve([{ id: `generated-${inserted.length}`, ...(Array.isArray(values) ? {} : values) }]),
      };
    },
  }));

  const update = jest.fn((table: unknown) => ({
    set: (set: Record<string, unknown>) => {
      updated.push({ table, set });
      return { where: () => Promise.resolve() };
    },
  }));

  return { select, insert, update, inserted, updated };
}

function createStorageHarness() {
  return {
    getObjectBuffer: jest.fn().mockResolvedValue(Buffer.from('<rss></rss>')),
    buildObjectKey: jest.fn(() => 'sites/site-1/2026/08/logo.jpg'),
    upload: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
    getPublicUrl: jest.fn(() => 'https://media.test/bucket/logo.jpg'),
  };
}

function job(): Job<WordpressImportJobData> {
  return {
    data: { importId: 'import-1', siteId: 'site-1', objectKey: 'sites/site-1/_wordpress-import/x.xml', triggeredBy: 'user-1' },
  } as unknown as Job<WordpressImportJobData>;
}

describe('WordpressImportProcessor', () => {
  beforeEach(() => {
    parseWxrMock.mockReset().mockReturnValue(PARSED_EXPORT);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'image/jpeg' },
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    }) as never;
  });

  it('imports every new row, links category/tag/thumbnail refs, and marks the run successful', async () => {
    // One empty (= "not found") select result per existence check, in call
    // order: category, tag, attachment, page, post.
    const db = createDbHarness([[], [], [], [], []]);
    const storage = createStorageHarness();
    const processor = new WordpressImportProcessor(db as never, storage as never);

    await processor.process(job());

    expect(storage.getObjectBuffer).toHaveBeenCalledWith('sites/site-1/_wordpress-import/x.xml');
    expect(global.fetch).toHaveBeenCalledWith('http://old.example.test/logo.jpg', expect.anything());
    expect(storage.upload).toHaveBeenCalledWith('sites/site-1/2026/08/logo.jpg', expect.any(Buffer), 'image/jpeg');

    const insertedTitles = db.inserted.map((row) => row.values['title']).filter(Boolean);
    expect(insertedTitles).toEqual(expect.arrayContaining(['Tentang Kami', 'Seminar']));

    const newsInsert = db.inserted.find((row) => row.values['title'] === 'Seminar');
    expect(newsInsert?.values).toMatchObject({
      bodyMarkdown: 'md:<p>Isi</p>',
      featuredImageUrl: 'https://media.test/bucket/logo.jpg',
      wpId: 123,
    });

    // status transitions: running, then success with final stats
    expect(db.updated[0].set).toMatchObject({ status: 'running' });
    const finalUpdate = db.updated.at(-1);
    expect(finalUpdate?.set).toMatchObject({
      status: 'success',
      stats: expect.objectContaining({
        categoriesImported: 1,
        tagsImported: 1,
        mediaImported: 1,
        mediaFailed: 0,
        pagesImported: 1,
        newsImported: 1,
      }),
    });

    // temp WXR object is always cleaned up
    expect(storage.remove).toHaveBeenCalledWith('sites/site-1/_wordpress-import/x.xml');
  });

  it('is idempotent: an already-imported wpId is neither re-fetched nor re-inserted', async () => {
    const db = createDbHarness([
      [{ id: 'cat-existing' }],
      [{ id: 'tag-existing' }],
      [{ id: 'media-existing', url: 'https://media.test/existing.jpg' }],
      [{ id: 'page-existing' }],
      [{ id: 'news-existing' }],
    ]);
    const storage = createStorageHarness();
    const processor = new WordpressImportProcessor(db as never, storage as never);

    await processor.process(job());

    expect(global.fetch).not.toHaveBeenCalled();
    expect(storage.upload).not.toHaveBeenCalled();
    expect(db.inserted).toHaveLength(0);

    const finalUpdate = db.updated.at(-1);
    expect(finalUpdate?.set).toMatchObject({
      status: 'success',
      stats: expect.objectContaining({
        categoriesImported: 0,
        tagsImported: 0,
        mediaImported: 0,
        pagesImported: 0,
        newsImported: 0,
      }),
    });
  });

  it('keeps going when an attachment download fails, recording it in stats instead of aborting the run', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 }) as never;
    const db = createDbHarness([[], [], [], [], []]);
    const storage = createStorageHarness();
    const processor = new WordpressImportProcessor(db as never, storage as never);

    await processor.process(job());

    const finalUpdate = db.updated.at(-1);
    expect(finalUpdate?.set).toMatchObject({ status: 'success' });
    const stats = finalUpdate?.set['stats'] as { mediaFailed: number; errors: string[] };
    expect(stats.mediaFailed).toBe(1);
    expect(stats.errors[0]).toContain('logo.jpg'.length > 0 ? 'http://old.example.test/logo.jpg' : '');

    // The post referencing the failed attachment as its thumbnail still imports, just without a featured image.
    const newsInsert = db.inserted.find((row) => row.values['title'] === 'Seminar');
    expect(newsInsert?.values['featuredImageUrl']).toBeUndefined();
  });

  it('marks the run failed and still cleans up the temp object when parsing throws', async () => {
    parseWxrMock.mockImplementation(() => {
      throw new Error('not a WXR file');
    });
    const db = createDbHarness([]);
    const storage = createStorageHarness();
    const processor = new WordpressImportProcessor(db as never, storage as never);

    await expect(processor.process(job())).rejects.toThrow('not a WXR file');

    const finalUpdate = db.updated.at(-1);
    expect(finalUpdate?.set).toMatchObject({ status: 'failed', error: 'not a WXR file' });
    expect(storage.remove).toHaveBeenCalledWith('sites/site-1/_wordpress-import/x.xml');
  });
});

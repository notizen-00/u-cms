import { NotFoundException } from '@nestjs/common';
import { WordpressImportService } from './wordpress-import.service';

function xmlFile(): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'export.xml',
    encoding: '7bit',
    mimetype: 'text/xml',
    size: 3,
    buffer: Buffer.from('<rss></rss>'),
  } as unknown as Express.Multer.File;
}

function createHarness() {
  const limit = jest.fn().mockResolvedValue([]);
  const where = jest.fn(() => ({ limit, orderBy: jest.fn().mockResolvedValue([]) }));
  const from = jest.fn(() => ({ where, orderBy: jest.fn().mockResolvedValue([]) }));
  const db = { select: jest.fn(() => ({ from })) };
  const storage = {
    buildObjectKey: jest.fn(() => 'sites/site-1/_wordpress-import/export.xml'),
    upload: jest.fn().mockResolvedValue(undefined),
  };
  const producer = { enqueue: jest.fn() };
  const service = new WordpressImportService(db as never, storage as never, producer as never);
  return { service, db, storage, producer, where, from, limit };
}

describe('WordpressImportService', () => {
  it('uploads the file to a throwaway MinIO key and hands off to the producer', async () => {
    const harness = createHarness();
    const enqueued = { id: 'import-1', status: 'queued' };
    harness.producer.enqueue.mockResolvedValue(enqueued);

    await expect(harness.service.create('site-1', 'user-1', xmlFile())).resolves.toBe(enqueued);

    expect(harness.storage.buildObjectKey).toHaveBeenCalledWith('site-1', '_wordpress-import/export.xml');
    expect(harness.storage.upload).toHaveBeenCalledWith(
      'sites/site-1/_wordpress-import/export.xml',
      expect.any(Buffer),
      'application/xml',
    );
    expect(harness.producer.enqueue).toHaveBeenCalledWith(
      'site-1',
      'sites/site-1/_wordpress-import/export.xml',
      'export.xml',
      'user-1',
    );
  });

  it('rejects when no file is present', async () => {
    const harness = createHarness();
    await expect(
      harness.service.create('site-1', 'user-1', undefined as unknown as Express.Multer.File),
    ).rejects.toThrow('No file uploaded');
  });

  it('findOne throws NotFoundException for an unknown id', async () => {
    const harness = createHarness();
    await expect(harness.service.findOne('site-1', 'missing')).rejects.toThrow(NotFoundException);
  });
});

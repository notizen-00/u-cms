import type { AuthenticatedUser } from '../auth/auth.service';
import { MediaService } from './media.service';

const uploader: AuthenticatedUser = {
  id: 'user-1',
  email: 'editor@example.test',
  name: 'Editor',
  isSuperAdmin: false,
};

function uploadedFile(): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'campus.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 3,
    buffer: Buffer.from([1, 2, 3]),
  } as unknown as Express.Multer.File;
}

function createHarness() {
  const returning = jest.fn();
  const values = jest.fn(() => ({ returning }));
  const db = {
    insert: jest.fn(() => ({ values })),
  };
  const storage = {
    buildObjectKey: jest.fn(() => 'sites/site-1/2026/08/id-campus.avif'),
    upload: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
    getPublicUrl: jest.fn(() => 'https://media.test/bucket/id-campus.avif'),
  };
  const pipeline = {
    process: jest.fn().mockResolvedValue({
      data: new Uint8Array([9, 8]),
      originalName: 'campus.jpg',
      storageName: 'campus.avif',
      mimeType: 'image/avif',
      width: 1200,
      height: 800,
    }),
  };
  const service = new MediaService(
    db as never,
    storage as never,
    pipeline as never,
  );

  return { service, db, storage, pipeline, returning, values };
}

describe('MediaService upload processing', () => {
  it('stores transformed bytes and output metadata while preserving originalName', async () => {
    const harness = createHarness();
    const created = { id: 'media-1', mimeType: 'image/avif' };
    harness.returning.mockResolvedValue([created]);

    await expect(
      harness.service.upload('site-1', uploader, uploadedFile(), {
        altText: 'Campus',
      }),
    ).resolves.toBe(created);

    expect(harness.pipeline.process).toHaveBeenCalledWith('site-1', {
      data: expect.any(Buffer),
      originalName: 'campus.jpg',
      storageName: 'campus.jpg',
      mimeType: 'image/jpeg',
    });
    expect(harness.storage.buildObjectKey).toHaveBeenCalledWith(
      'site-1',
      'campus.avif',
    );
    expect(harness.storage.upload).toHaveBeenCalledWith(
      'sites/site-1/2026/08/id-campus.avif',
      Buffer.from([9, 8]),
      'image/avif',
    );
    expect(harness.values).toHaveBeenCalledWith(
      expect.objectContaining({
        originalName: 'campus.jpg',
        mimeType: 'image/avif',
        size: 2,
        width: 1200,
        height: 800,
      }),
    );
    expect(harness.storage.remove).not.toHaveBeenCalled();
  });

  it('removes the uploaded object if inserting its database row fails', async () => {
    const harness = createHarness();
    const databaseError = new Error('database unavailable');
    harness.returning.mockRejectedValue(databaseError);

    await expect(
      harness.service.upload('site-1', uploader, uploadedFile(), {}),
    ).rejects.toBe(databaseError);

    expect(harness.storage.upload).toHaveBeenCalledTimes(1);
    expect(harness.storage.remove).toHaveBeenCalledWith(
      'sites/site-1/2026/08/id-campus.avif',
    );
  });
});

import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  MediaProcessingError,
  defineMediaUploadProcessor,
  type MediaUploadAsset,
} from '@unej-cms/sdk-media';
import { applyMediaUploadProcessors } from './media-upload-pipeline.service';

const input: MediaUploadAsset = {
  data: new Uint8Array([1, 2, 3]),
  originalName: 'photo.jpg',
  storageName: 'photo.jpg',
  mimeType: 'image/jpeg',
};

describe('applyMediaUploadProcessors', () => {
  it('runs matching processors in deterministic priority order', async () => {
    const calls: string[] = [];
    const late = defineMediaUploadProcessor({
      id: 'late',
      priority: 20,
      supports: () => true,
      process: (asset) => {
        calls.push('late');
        return asset;
      },
    });
    const early = defineMediaUploadProcessor({
      id: 'early',
      priority: 5,
      supports: () => true,
      process: (asset) => {
        calls.push('early');
        return { ...asset, storageName: 'photo.avif', mimeType: 'image/avif' };
      },
    });

    const result = await applyMediaUploadProcessors(input, { siteId: 'site-1' }, [
      { pluginSlug: 'plugin.late', processor: late },
      { pluginSlug: 'plugin.early', processor: early },
    ]);

    expect(calls).toEqual(['early', 'late']);
    expect(result.mimeType).toBe('image/avif');
  });

  it('does not invoke processors that do not support the current asset', async () => {
    const process = jest.fn((asset: MediaUploadAsset) => asset);
    const processor = defineMediaUploadProcessor({
      id: 'images-only',
      supports: () => false,
      process,
    });

    await expect(
      applyMediaUploadProcessors(input, { siteId: 'site-1' }, [
        { pluginSlug: 'plugin.images', processor },
      ]),
    ).resolves.toBe(input);
    expect(process).not.toHaveBeenCalled();
  });

  it('turns a safe processor error into a clear bad request without fallback', async () => {
    const processor = defineMediaUploadProcessor({
      id: 'broken-image',
      supports: () => true,
      process: () => {
        throw new MediaProcessingError(
          'broken-image',
          'Image could not be converted to AVIF.',
        );
      },
    });

    await expect(
      applyMediaUploadProcessors(input, { siteId: 'site-1' }, [
        { pluginSlug: 'plugin.avif', processor },
      ]),
    ).rejects.toMatchObject({
      message: 'Image could not be converted to AVIF.',
    });
  });

  it('rejects invalid processor output as a host error', async () => {
    const processor = defineMediaUploadProcessor({
      id: 'invalid-output',
      supports: () => true,
      process: (asset) => ({ ...asset, originalName: 'renamed.jpg' }),
    });

    await expect(
      applyMediaUploadProcessors(input, { siteId: 'site-1' }, [
        { pluginSlug: 'plugin.invalid', processor },
      ]),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('rejects empty or oversized upload input before invoking plugins', async () => {
    await expect(
      applyMediaUploadProcessors(
        { ...input, data: new Uint8Array() },
        { siteId: 'site-1' },
        [],
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      applyMediaUploadProcessors(
        { ...input, data: new Uint8Array(10 * 1024 * 1024 + 1) },
        { siteId: 'site-1' },
        [],
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

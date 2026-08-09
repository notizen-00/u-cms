import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  MediaProcessingError,
  type MediaUploadAsset,
  type MediaUploadContext,
  type MediaUploadProcessor,
} from '@unej-cms/sdk-media';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import type { DrizzleDb } from '../../database/database.types';
import { sitePlugins } from '../../database/schema';
import { findPluginImplementation } from '../plugins/plugin-registry';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from './media.constants';

export interface RegisteredMediaUploadProcessor {
  readonly pluginSlug: string;
  readonly processor: MediaUploadProcessor;
}

function invalidAssetReason(
  asset: MediaUploadAsset,
  expectedOriginalName: string,
): string | undefined {
  if (!(asset.data instanceof Uint8Array) || asset.data.byteLength === 0) {
    return 'output data must be a non-empty Uint8Array';
  }
  if (asset.data.byteLength > MAX_FILE_SIZE_BYTES) {
    return `output exceeds ${MAX_FILE_SIZE_BYTES} bytes`;
  }
  if (asset.originalName !== expectedOriginalName) {
    return 'processors must preserve originalName';
  }
  if (
    !asset.storageName.trim() ||
    asset.storageName.length > 255 ||
    /[/\\]/.test(asset.storageName)
  ) {
    return 'storageName must be a safe file name';
  }
  if (!ALLOWED_MIME_TYPES.includes(asset.mimeType as never)) {
    return `unsupported output type: ${asset.mimeType}`;
  }

  const hasWidth = asset.width !== undefined;
  const hasHeight = asset.height !== undefined;
  if (hasWidth !== hasHeight) {
    return 'width and height must be provided together';
  }
  if (
    (hasWidth && (!Number.isInteger(asset.width) || (asset.width ?? 0) <= 0)) ||
    (hasHeight && (!Number.isInteger(asset.height) || (asset.height ?? 0) <= 0))
  ) {
    return 'width and height must be positive integers';
  }

  return undefined;
}

/**
 * Apply already-resolved processors. Exported separately so ordering, failure
 * semantics, and output validation can be tested without a database runtime.
 */
export async function applyMediaUploadProcessors(
  input: MediaUploadAsset,
  context: MediaUploadContext,
  registrations: readonly RegisteredMediaUploadProcessor[],
): Promise<MediaUploadAsset> {
  const originalName = input.originalName;
  const initialError = invalidAssetReason(input, originalName);
  if (initialError) {
    throw new BadRequestException(`Invalid media upload: ${initialError}`);
  }

  const ordered = [...registrations].sort(
    (left, right) =>
      (left.processor.priority ?? 10) - (right.processor.priority ?? 10) ||
      left.pluginSlug.localeCompare(right.pluginSlug) ||
      left.processor.id.localeCompare(right.processor.id),
  );

  let current = input;
  for (const { pluginSlug, processor } of ordered) {
    let supported: boolean;
    try {
      supported = processor.supports(current);
    } catch (error) {
      throw new InternalServerErrorException(
        `Media processor "${processor.id}" failed while checking support`,
        { cause: error },
      );
    }
    if (!supported) {
      continue;
    }

    let output: MediaUploadAsset;
    try {
      output = await processor.process(current, context);
    } catch (error) {
      if (error instanceof MediaProcessingError) {
        throw new BadRequestException(error.message, { cause: error });
      }
      throw new InternalServerErrorException(
        `Media processor "${processor.id}" from plugin "${pluginSlug}" failed`,
        { cause: error },
      );
    }

    const invalidOutput = invalidAssetReason(output, originalName);
    if (invalidOutput) {
      throw new InternalServerErrorException(
        `Media processor "${processor.id}" returned invalid output: ${invalidOutput}`,
      );
    }
    current = output;
  }

  return current;
}

@Injectable()
export class MediaUploadPipelineService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async process(
    siteId: string,
    input: MediaUploadAsset,
  ): Promise<MediaUploadAsset> {
    const activePlugins = await this.db
      .select({ pluginSlug: sitePlugins.pluginSlug })
      .from(sitePlugins)
      .where(
        and(
          eq(sitePlugins.siteId, siteId),
          eq(sitePlugins.isActive, true),
        ),
      );

    const registrations: RegisteredMediaUploadProcessor[] = [];
    for (const { pluginSlug } of activePlugins) {
      const plugin = findPluginImplementation(pluginSlug);
      for (const processor of plugin?.media?.uploadProcessors ?? []) {
        registrations.push({ pluginSlug, processor });
      }
    }

    return applyMediaUploadProcessors(input, { siteId }, registrations);
  }
}

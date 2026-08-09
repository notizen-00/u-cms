import { deepFreeze } from "@unej-cms/sdk-core";

/**
 * The mutable upload request is normalised into this runtime-independent
 * value before any plugin sees it. `originalName` is provenance and must stay
 * unchanged; processors may change `storageName` when they change the format.
 */
export interface MediaUploadAsset {
  readonly data: Uint8Array;
  readonly originalName: string;
  readonly storageName: string;
  readonly mimeType: string;
  readonly width?: number;
  readonly height?: number;
}

export interface MediaUploadContext {
  readonly siteId: string;
}

/** A synchronous upload-stage transformation supplied by an active plugin. */
export interface MediaUploadProcessor {
  readonly id: string;
  /** Lower values run first. Defaults to 10 in the host runtime. */
  readonly priority?: number;
  supports(asset: MediaUploadAsset): boolean;
  process(
    asset: MediaUploadAsset,
    context: MediaUploadContext,
  ): MediaUploadAsset | Promise<MediaUploadAsset>;
}

export interface DefineMediaUploadProcessorInput {
  readonly id: string;
  readonly priority?: number;
  supports(asset: MediaUploadAsset): boolean;
  process(
    asset: MediaUploadAsset,
    context: MediaUploadContext,
  ): MediaUploadAsset | Promise<MediaUploadAsset>;
}

/**
 * Error intended for safe propagation to the upload caller. Processor
 * implementations should hide codec/runtime details behind a useful message.
 */
export class MediaProcessingError extends Error {
  constructor(
    public readonly processorId: string,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "MediaProcessingError";
  }
}

/** Declare and freeze an upload processor, failing early on invalid metadata. */
export function defineMediaUploadProcessor(
  input: DefineMediaUploadProcessorInput,
): MediaUploadProcessor {
  const id = input.id.trim();
  if (!id) {
    throw new TypeError("Media upload processor id must not be empty");
  }
  if (
    input.priority !== undefined &&
    (!Number.isFinite(input.priority) || !Number.isInteger(input.priority))
  ) {
    throw new TypeError("Media upload processor priority must be a finite integer");
  }

  return deepFreeze({ ...input, id });
}

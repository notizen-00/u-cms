import type { StorageEntry, StorageStat, StorageWriteOptions } from "./types.js";

/**
 * The only storage abstraction a plugin is allowed to know about (see
 * Security: no direct filesystem access). Whether this is backed by local
 * disk, S3, MinIO or anything else is decided entirely by the Runtime.
 */
export interface StorageDriver {
  write(path: string, data: Uint8Array | string, options?: StorageWriteOptions): Promise<void>;
  read(path: string): Promise<Uint8Array>;
  delete(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  list(prefix: string): Promise<readonly StorageEntry[]>;
  stat(path: string): Promise<StorageStat | null>;
  getUrl(path: string): Promise<string>;
}

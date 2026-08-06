export type StorageVisibility = "public" | "private";

export interface StorageWriteOptions {
  readonly contentType?: string;
  readonly visibility?: StorageVisibility;
}

export interface StorageStat {
  readonly path: string;
  readonly size: number;
  readonly contentType?: string;
  readonly lastModifiedAt: string;
}

export interface StorageEntry {
  readonly path: string;
  readonly size: number;
  readonly isDirectory: boolean;
}

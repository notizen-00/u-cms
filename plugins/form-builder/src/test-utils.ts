import type { StorageDriver } from "@unej-cms/sdk-storage";

/** In-memory StorageDriver good enough for this plugin's own tests. */
export function createMemoryStorage(): StorageDriver {
  const files = new Map<string, string>();

  return {
    async write(path, data) {
      files.set(path, typeof data === "string" ? data : new TextDecoder().decode(data));
    },
    async read(path) {
      const content = files.get(path);
      if (content === undefined) throw new Error(`not found: ${path}`);
      return new TextEncoder().encode(content);
    },
    async delete(path) {
      files.delete(path);
    },
    async exists(path) {
      return files.has(path);
    },
    async list(prefix) {
      return Array.from(files.entries())
        .filter(([path]) => path.startsWith(prefix))
        .map(([path, content]) => ({ path, size: content.length, isDirectory: false }));
    },
    async stat(path) {
      const content = files.get(path);
      if (content === undefined) return null;
      return { path, size: content.length, lastModifiedAt: new Date().toISOString() };
    },
    async getUrl(path) {
      return `memory://${path}`;
    },
  };
}

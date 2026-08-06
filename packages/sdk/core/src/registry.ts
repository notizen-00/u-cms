/**
 * Minimal, dependency-free registry contract reused by every domain package
 * (Plugin Registry, Block Registry, Permission Registry, ...). Registration
 * is idempotent-safe: registering the same key twice throws, so plugins
 * cannot silently clobber each other's entries.
 */
export interface Registry<TKey extends string, TValue> {
  register(key: TKey, value: TValue): void;
  unregister(key: TKey): boolean;
  get(key: TKey): TValue | undefined;
  has(key: TKey): boolean;
  list(): readonly TValue[];
  keys(): readonly TKey[];
}

export class DuplicateRegistrationError extends Error {
  constructor(public readonly key: string, public readonly registryName: string) {
    super(`"${key}" is already registered in ${registryName}`);
    this.name = "DuplicateRegistrationError";
  }
}

export interface CreateRegistryOptions {
  readonly name: string;
}

export function createRegistry<TKey extends string, TValue>(
  options: CreateRegistryOptions,
): Registry<TKey, TValue> {
  const entries = new Map<TKey, TValue>();

  return {
    register(key, value) {
      if (entries.has(key)) {
        throw new DuplicateRegistrationError(key, options.name);
      }
      entries.set(key, value);
    },
    unregister(key) {
      return entries.delete(key);
    },
    get(key) {
      return entries.get(key);
    },
    has(key) {
      return entries.has(key);
    },
    list() {
      return Array.from(entries.values());
    },
    keys() {
      return Array.from(entries.keys());
    },
  };
}

/**
 * Recursively freezes an object graph. Domain packages call this on
 * definitions returned from `define*()` helpers so a plugin cannot mutate
 * its own manifest/definition after declaring it (Immutable Contract principle).
 */
export function deepFreeze<T>(value: T): Readonly<T> {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value as Readonly<T>;
  }
  for (const key of Object.keys(value as object)) {
    deepFreeze((value as Record<string, unknown>)[key]);
  }
  return Object.freeze(value) as Readonly<T>;
}

/** Exhaustiveness helper for `switch` statements over union types. */
export function assertNever(value: never, message = "Unhandled case"): never {
  throw new Error(`${message}: ${JSON.stringify(value)}`);
}

/**
 * The only logging surface a plugin is allowed to touch (see Security: a
 * plugin must never call `console.*` directly). The Runtime supplies the
 * concrete implementation; the SDK only defines the shape and a couple of
 * dependency-free helpers for composing it.
 */
export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  trace(message: string, meta?: Record<string, unknown>): void;
}

/** Wraps a Logger so every call is automatically tagged with a namespace (e.g. the plugin id). */
export function createNamespacedLogger(logger: Logger, namespace: string): Logger {
  const withNamespace = (meta?: Record<string, unknown>) => ({ ...meta, namespace });
  return {
    debug: (message, meta) => logger.debug(message, withNamespace(meta)),
    info: (message, meta) => logger.info(message, withNamespace(meta)),
    warn: (message, meta) => logger.warn(message, withNamespace(meta)),
    error: (message, meta) => logger.error(message, withNamespace(meta)),
    trace: (message, meta) => logger.trace(message, withNamespace(meta)),
  };
}

/** No-op logger, useful as a safe default in tests or before a Runtime logger is wired up. */
export function createNoopLogger(): Logger {
  return {
    debug: () => undefined,
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
    trace: () => undefined,
  };
}

import type { Unsubscribe } from "./bus.js";

/** WordPress-filter-style hook: transforms a value through every registered handler in priority order. */
export type HookHandler<TValue, TArgs extends readonly unknown[] = []> = (
  value: TValue,
  ...args: TArgs
) => TValue | Promise<TValue>;

export interface RegisterHookOptions {
  /** Lower runs first. Defaults to 10. */
  readonly priority?: number;
}

export interface HookBus {
  register<TValue, TArgs extends readonly unknown[] = []>(
    name: string,
    handler: HookHandler<TValue, TArgs>,
    options?: RegisterHookOptions,
  ): Unsubscribe;
  apply<TValue, TArgs extends readonly unknown[] = []>(
    name: string,
    value: TValue,
    ...args: TArgs
  ): Promise<TValue>;
}

interface RegisteredHandler {
  readonly handler: HookHandler<unknown, readonly unknown[]>;
  readonly priority: number;
}

export function createHookBus(): HookBus {
  const hooks = new Map<string, RegisteredHandler[]>();

  return {
    register(name, handler, options) {
      const priority = options?.priority ?? 10;
      const entry: RegisteredHandler = {
        handler: handler as HookHandler<unknown, readonly unknown[]>,
        priority,
      };
      const list = hooks.get(name) ?? [];
      list.push(entry);
      list.sort((a, b) => a.priority - b.priority);
      hooks.set(name, list);
      return () => {
        const current = hooks.get(name);
        if (!current) return;
        hooks.set(
          name,
          current.filter((registered) => registered !== entry),
        );
      };
    },
    async apply(name, value, ...args) {
      const list = hooks.get(name);
      if (!list || list.length === 0) return value;

      let result = value;
      for (const { handler } of list) {
        result = (await handler(result, ...args)) as typeof value;
      }
      return result;
    },
  };
}

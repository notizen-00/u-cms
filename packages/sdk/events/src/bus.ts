import type { Logger } from "@unej-cms/sdk-core";
import { createEvent, type CmsEvent } from "./event.js";

export type EventListener<TPayload = unknown> = (
  event: CmsEvent<TPayload>,
) => void | Promise<void>;

export type Unsubscribe = () => void;

/**
 * The contract a plugin uses to Listen / Dispatch / Subscribe / Unsubscribe.
 * The Runtime may back this with its own message bus; `createEventBus`
 * below is a dependency-free reference implementation good enough for
 * single-process use and for `sdk-testing` mocks.
 */
export interface EventBus {
  on<TPayload = unknown>(type: string, listener: EventListener<TPayload>): Unsubscribe;
  once<TPayload = unknown>(type: string, listener: EventListener<TPayload>): Unsubscribe;
  off(type: string, listener: EventListener<never>): void;
  emit<TPayload = unknown>(type: string, payload: TPayload): Promise<void>;
}

export interface CreateEventBusOptions {
  readonly logger?: Logger;
}

export function createEventBus(options: CreateEventBusOptions = {}): EventBus {
  const listeners = new Map<string, Set<EventListener<never>>>();

  function subscribe(type: string, listener: EventListener<never>): Unsubscribe {
    const set = listeners.get(type) ?? new Set<EventListener<never>>();
    set.add(listener);
    listeners.set(type, set);
    return () => set.delete(listener);
  }

  return {
    on(type, listener) {
      return subscribe(type, listener as EventListener<never>);
    },
    once(type, listener) {
      const unsubscribe = subscribe(type, async (event) => {
        unsubscribe();
        await listener(event as CmsEvent<never>);
      });
      return unsubscribe;
    },
    off(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    async emit(type, payload) {
      const event = createEvent(type, payload);
      const subscribers = listeners.get(type);
      if (!subscribers || subscribers.size === 0) return;

      await Promise.all(
        Array.from(subscribers).map(async (listener) => {
          try {
            await listener(event as CmsEvent<never>);
          } catch (error) {
            options.logger?.error(`Event listener for "${type}" threw`, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }),
      );
    },
  };
}

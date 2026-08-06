import { describe, expect, it, vi } from "vitest";
import { createEventBus } from "./bus.js";

describe("createEventBus", () => {
  it("delivers emitted events to subscribers", async () => {
    const bus = createEventBus();
    const listener = vi.fn();
    bus.on<{ title: string }>("post.created", listener);

    await bus.emit("post.created", { title: "Hello" });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0]).toMatchObject({
      type: "post.created",
      payload: { title: "Hello" },
    });
  });

  it("only fires once() listeners a single time", async () => {
    const bus = createEventBus();
    const listener = vi.fn();
    bus.once("post.created", listener);

    await bus.emit("post.created", {});
    await bus.emit("post.created", {});

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("stops delivering to unsubscribed listeners", async () => {
    const bus = createEventBus();
    const listener = vi.fn();
    const unsubscribe = bus.on("post.created", listener);
    unsubscribe();

    await bus.emit("post.created", {});

    expect(listener).not.toHaveBeenCalled();
  });

  it("isolates listener errors from each other", async () => {
    const bus = createEventBus();
    const failing = vi.fn(() => {
      throw new Error("boom");
    });
    const succeeding = vi.fn();
    bus.on("post.created", failing);
    bus.on("post.created", succeeding);

    await expect(bus.emit("post.created", {})).resolves.toBeUndefined();
    expect(succeeding).toHaveBeenCalledTimes(1);
  });
});

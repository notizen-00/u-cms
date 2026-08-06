import { describe, expect, it } from "vitest";
import { createNoopLogger } from "@unej-cms/sdk-core";
import { createEventBus, createHookBus } from "@unej-cms/sdk-events";
import type { PluginRuntimeContext } from "@unej-cms/sdk-plugin";
import type { AuthContext } from "@unej-cms/sdk-auth";
import { submitFormHandler } from "./actions.js";
import { saveForm } from "./storage.js";
import { manifest } from "./manifest.js";
import { onSubmitErrorTrigger, onSubmitSuccessTrigger } from "./triggers.js";
import { createMemoryStorage } from "./test-utils.js";

const anonymousAuth: AuthContext = {
  currentUser: null,
  hasPermission: () => false,
  hasRole: () => false,
};

function createContext(storage = createMemoryStorage()): PluginRuntimeContext {
  return {
    manifest,
    logger: createNoopLogger(),
    events: createEventBus(),
    hooks: createHookBus(),
    auth: anonymousAuth,
    storage,
  };
}

describe("submitFormHandler", () => {
  it("stores a valid submission and emits the success trigger", async () => {
    const context = createContext();
    const form = await saveForm(context.storage, "site-1", {
      title: "Contact",
      fields: [{ key: "name", label: "Name", type: "text", required: true }],
    });

    let emittedFormId: string | undefined;
    context.events.on(onSubmitSuccessTrigger.id, (event) => {
      emittedFormId = (event.payload as { formId: string }).formId;
    });

    const result = await submitFormHandler(context, {
      siteId: "site-1",
      formId: form.id,
      data: { name: "Ada" },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.submissionId).toBeTruthy();
    }
    expect(emittedFormId).toBe(form.id);
  });

  it("rejects an invalid submission and emits the error trigger, without storing it", async () => {
    const context = createContext();
    const form = await saveForm(context.storage, "site-1", {
      title: "Contact",
      fields: [{ key: "name", label: "Name", type: "text", required: true }],
    });

    let errorEmitted = false;
    context.events.on(onSubmitErrorTrigger.id, () => {
      errorEmitted = true;
    });

    const result = await submitFormHandler(context, {
      siteId: "site-1",
      formId: form.id,
      data: {},
    });

    expect(result.ok).toBe(false);
    expect(errorEmitted).toBe(true);
  });

  it("fails cleanly when the form does not exist", async () => {
    const context = createContext();
    const result = await submitFormHandler(context, {
      siteId: "site-1",
      formId: "does-not-exist",
      data: {},
    });
    expect(result.ok).toBe(false);
  });
});

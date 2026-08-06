import type { JsonObject, ValidationIssue } from "@unej-cms/sdk-core";
import { defineAction, definePropertySchema } from "@unej-cms/sdk-ui";
import type { PluginRuntimeContext } from "@unej-cms/sdk-plugin";
import { validateSubmission } from "./fields.js";
import { getForm, recordSubmission } from "./storage.js";
import { onSubmitErrorTrigger, onSubmitSuccessTrigger } from "./triggers.js";

export interface SubmitFormInput {
  readonly siteId: string;
  readonly formId: string;
  readonly data: JsonObject;
}

export type SubmitFormResult =
  | { readonly ok: true; readonly submissionId: string; readonly successMessage: string }
  | { readonly ok: false; readonly errors: readonly ValidationIssue[] };

/**
 * The concrete handler bound to `submitFormAction`. Only touches the plugin
 * through `PluginRuntimeContext` (storage, events, logger) — never a
 * Backend/Dashboard internal (Runtime Independent principle).
 */
export async function submitFormHandler(
  context: PluginRuntimeContext,
  input: SubmitFormInput,
): Promise<SubmitFormResult> {
  const form = await getForm(context.storage, input.siteId, input.formId);
  if (!form) {
    context.logger.warn(`form "${input.formId}" not found`, { siteId: input.siteId });
    return { ok: false, errors: [{ path: "formId", message: "form not found" }] };
  }

  const result = validateSubmission(form.fields, input.data);
  if (!result.ok) {
    await context.events.emit(onSubmitErrorTrigger.id, {
      formId: input.formId,
      errors: result.errors,
    });
    return { ok: false, errors: result.errors };
  }

  const submission = await recordSubmission(context.storage, input.siteId, input.formId, result.value);
  await context.events.emit(onSubmitSuccessTrigger.id, {
    formId: input.formId,
    submissionId: submission.id,
  });

  return { ok: true, submissionId: submission.id, successMessage: form.successMessage };
}

export const submitFormAction = defineAction({
  id: "unej.form-builder.submit-form",
  label: "Submit Form",
  description: "Validates a visitor's submission against the form's field configuration and stores it.",
  icon: "send",
  inputSchema: definePropertySchema({
    formId: { type: "string", label: "Form ID", required: true },
  }),
  handler: submitFormHandler,
});

import type { JsonObject } from "@unej-cms/sdk-core";
import type { StorageDriver } from "@unej-cms/sdk-storage";
import type { FormFieldConfig } from "./fields.js";

export interface StoredForm {
  readonly id: string;
  readonly title: string;
  readonly fields: readonly FormFieldConfig[];
  readonly submitLabel: string;
  readonly successMessage: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface StoredSubmission {
  readonly id: string;
  readonly formId: string;
  readonly submittedAt: string;
  readonly data: JsonObject;
}

export interface SaveFormInput {
  readonly id?: string;
  readonly title: string;
  readonly fields: readonly FormFieldConfig[];
  readonly submitLabel?: string;
  readonly successMessage?: string;
}

let idCounter = 0;

function generateId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter.toString(36)}`;
}

// All plugin state lives under a single namespaced prefix so activation never
// collides with another plugin's use of the same StorageDriver (Isolation).
function formsIndexPath(siteId: string): string {
  return `sites/${siteId}/form-builder/forms.json`;
}

function submissionsListPath(siteId: string, formId: string): string {
  return `sites/${siteId}/form-builder/submissions/${formId}.json`;
}

async function readJson<T>(storage: StorageDriver, path: string, fallback: T): Promise<T> {
  if (!(await storage.exists(path))) return fallback;
  const raw = await storage.read(path);
  return JSON.parse(new TextDecoder().decode(raw)) as T;
}

async function writeJson(storage: StorageDriver, path: string, value: unknown): Promise<void> {
  await storage.write(path, JSON.stringify(value, null, 2), { contentType: "application/json" });
}

export async function listForms(storage: StorageDriver, siteId: string): Promise<readonly StoredForm[]> {
  return readJson(storage, formsIndexPath(siteId), []);
}

export async function getForm(
  storage: StorageDriver,
  siteId: string,
  formId: string,
): Promise<StoredForm | undefined> {
  const forms = await listForms(storage, siteId);
  return forms.find((form) => form.id === formId);
}

export async function saveForm(
  storage: StorageDriver,
  siteId: string,
  input: SaveFormInput,
): Promise<StoredForm> {
  const forms = [...(await listForms(storage, siteId))];
  const now = new Date().toISOString();
  const existingIndex = input.id ? forms.findIndex((form) => form.id === input.id) : -1;
  const existing = existingIndex >= 0 ? forms[existingIndex] : undefined;

  const form: StoredForm = {
    id: input.id ?? generateId("form"),
    title: input.title,
    fields: input.fields,
    submitLabel: input.submitLabel ?? "Send",
    successMessage: input.successMessage ?? "Thanks! Your submission has been received.",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  if (existingIndex >= 0) {
    forms[existingIndex] = form;
  } else {
    forms.push(form);
  }

  await writeJson(storage, formsIndexPath(siteId), forms);
  return form;
}

export async function deleteForm(storage: StorageDriver, siteId: string, formId: string): Promise<void> {
  const forms = await listForms(storage, siteId);
  await writeJson(
    storage,
    formsIndexPath(siteId),
    forms.filter((form) => form.id !== formId),
  );
  await storage.delete(submissionsListPath(siteId, formId)).catch(() => undefined);
}

export async function listSubmissions(
  storage: StorageDriver,
  siteId: string,
  formId: string,
): Promise<readonly StoredSubmission[]> {
  return readJson(storage, submissionsListPath(siteId, formId), []);
}

export async function recordSubmission(
  storage: StorageDriver,
  siteId: string,
  formId: string,
  data: JsonObject,
): Promise<StoredSubmission> {
  const submissions = [...(await listSubmissions(storage, siteId, formId))];
  const submission: StoredSubmission = {
    id: generateId("sub"),
    formId,
    submittedAt: new Date().toISOString(),
    data,
  };
  submissions.push(submission);
  await writeJson(storage, submissionsListPath(siteId, formId), submissions);
  return submission;
}

import { err, ok, type JsonObject, type JsonValue, type Result, type ValidationIssue } from "@unej-cms/sdk-core";

export type FormFieldType = "text" | "email" | "number" | "textarea" | "select" | "checkbox";

export interface FormFieldConfig {
  readonly key: string;
  readonly label: string;
  readonly type: FormFieldType;
  readonly required?: boolean;
  readonly placeholder?: string;
  /** Comma-separated option labels; only meaningful when `type` is `select`. */
  readonly options?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseSelectOptions(field: FormFieldConfig): readonly string[] {
  return (field.options ?? "")
    .split(",")
    .map((option) => option.trim())
    .filter((option) => option.length > 0);
}

/**
 * Validates a raw submission payload against a form's field configuration.
 * Pure and I/O-free so it can run identically in the Backend, in a Dashboard
 * live-preview, or in a test (Framework Agnostic principle).
 */
export function validateSubmission(
  fields: readonly FormFieldConfig[],
  payload: JsonObject,
): Result<JsonObject, ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const cleaned: Record<string, JsonValue> = {};
  const knownKeys = new Set(fields.map((field) => field.key));

  for (const key of Object.keys(payload)) {
    if (!knownKeys.has(key)) {
      issues.push({ path: key, message: `unknown field "${key}"` });
    }
  }

  for (const field of fields) {
    const value = payload[field.key];
    const isEmpty = value === undefined || value === null || value === "";

    if (isEmpty) {
      if (field.required) {
        issues.push({ path: field.key, message: `"${field.label}" is required` });
      }
      continue;
    }

    if (!isValidForType(field, value)) {
      issues.push({ path: field.key, message: describeTypeError(field) });
      continue;
    }

    cleaned[field.key] = value;
  }

  return issues.length === 0 ? ok(cleaned) : err(issues);
}

function isValidForType(field: FormFieldConfig, value: JsonValue): boolean {
  switch (field.type) {
    case "email":
      return typeof value === "string" && EMAIL_PATTERN.test(value);
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "checkbox":
      return typeof value === "boolean";
    case "select":
      return typeof value === "string" && parseSelectOptions(field).includes(value);
    case "text":
    case "textarea":
      return typeof value === "string";
  }
}

function describeTypeError(field: FormFieldConfig): string {
  switch (field.type) {
    case "email":
      return `"${field.label}" must be a valid email`;
    case "number":
      return `"${field.label}" must be a number`;
    case "checkbox":
      return `"${field.label}" must be true or false`;
    case "select":
      return `"${field.label}" must be one of: ${parseSelectOptions(field).join(", ")}`;
    case "text":
    case "textarea":
      return `"${field.label}" must be text`;
  }
}

import { describe, expect, it } from "vitest";
import { validateSubmission, type FormFieldConfig } from "./fields.js";

const fields: readonly FormFieldConfig[] = [
  { key: "name", label: "Name", type: "text", required: true },
  { key: "email", label: "Email", type: "email", required: true },
  { key: "age", label: "Age", type: "number" },
  { key: "subscribe", label: "Subscribe", type: "checkbox" },
  { key: "plan", label: "Plan", type: "select", options: "Free, Pro, Enterprise" },
];

describe("validateSubmission", () => {
  it("accepts a fully valid payload", () => {
    const result = validateSubmission(fields, {
      name: "Ada",
      email: "ada@example.com",
      age: 30,
      subscribe: true,
      plan: "Pro",
    });
    expect(result.ok).toBe(true);
  });

  it("accepts a payload that omits optional fields", () => {
    const result = validateSubmission(fields, { name: "Ada", email: "ada@example.com" });
    expect(result.ok).toBe(true);
  });

  it("rejects a missing required field", () => {
    const result = validateSubmission(fields, { email: "ada@example.com" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((issue) => issue.path === "name")).toBe(true);
    }
  });

  it("rejects an invalid email", () => {
    const result = validateSubmission(fields, { name: "Ada", email: "not-an-email" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((issue) => issue.path === "email")).toBe(true);
    }
  });

  it("rejects a select value outside the declared options", () => {
    const result = validateSubmission(fields, {
      name: "Ada",
      email: "ada@example.com",
      plan: "Unlimited",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((issue) => issue.path === "plan")).toBe(true);
    }
  });

  it("rejects an unknown field key", () => {
    const result = validateSubmission(fields, {
      name: "Ada",
      email: "ada@example.com",
      unexpected: "value",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((issue) => issue.path === "unexpected")).toBe(true);
    }
  });

  it("rejects a non-numeric value for a number field", () => {
    const result = validateSubmission(fields, {
      name: "Ada",
      email: "ada@example.com",
      age: "thirty",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((issue) => issue.path === "age")).toBe(true);
    }
  });
});

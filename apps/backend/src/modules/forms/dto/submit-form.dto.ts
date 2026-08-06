import { z } from 'zod';

// Deliberately permissive at the wire level — the actual per-field validation
// (required/type/select-options) happens against the form's own field
// config via @unej-cms/plugin-form-builder's validateSubmission().
export const submitFormSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.null()]),
);

export type SubmitFormDto = z.infer<typeof submitFormSchema>;

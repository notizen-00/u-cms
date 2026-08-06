import { z } from 'zod';

// Mirrors @unej-cms/plugin-form-builder's FormFieldConfig — kept as a local
// Zod shape (rather than importing the SDK type) since this DTO validates
// the *wire* shape, independent of the plugin package's TS types.
const formFieldSchema = z.object({
  key: z.string().min(1).max(100),
  label: z.string().min(1).max(255),
  type: z.enum(['text', 'email', 'number', 'textarea', 'select', 'checkbox']),
  required: z.boolean().optional(),
  placeholder: z.string().max(255).optional(),
  options: z.string().max(1000).optional(),
});

export const createFormSchema = z.object({
  title: z.string().min(1).max(255),
  fields: z.array(formFieldSchema).default([]),
  submitLabel: z.string().min(1).max(100).optional(),
  successMessage: z.string().min(1).max(1000).optional(),
});

export type CreateFormDto = z.infer<typeof createFormSchema>;

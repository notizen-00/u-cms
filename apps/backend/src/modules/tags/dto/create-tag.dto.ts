import { z } from 'zod';

export const createTagSchema = z.object({
  name: z.string().trim().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumeric with dashes'),
});

export type CreateTagDto = z.infer<typeof createTagSchema>;

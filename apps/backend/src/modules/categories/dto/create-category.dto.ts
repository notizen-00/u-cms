import { z } from 'zod';

const slugSchema = z
  .string()
  .min(1)
  .max(150)
  .regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumeric with dashes');

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(150),
  slug: slugSchema,
  parentId: z.string().uuid().nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  seoTitle: z.string().max(255).nullable().optional(),
  seoDescription: z.string().max(500).nullable().optional(),
});

export type CreateCategoryDto = z.infer<typeof createCategorySchema>;

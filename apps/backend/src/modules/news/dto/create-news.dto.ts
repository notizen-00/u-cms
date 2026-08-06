import { z } from 'zod';
import { categoryIdsSchema, tagIdsSchema } from './taxonomy-ids.schema';

export const createNewsSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumeric with dashes'),
  excerpt: z.string().max(500).optional(),
  bodyMarkdown: z.string().optional(),
  featuredImageUrl: z.string().url().optional(),
  categoryIds: categoryIdsSchema.default([]),
  tagIds: tagIdsSchema.default([]),
});

export type CreateNewsDto = z.infer<typeof createNewsSchema>;

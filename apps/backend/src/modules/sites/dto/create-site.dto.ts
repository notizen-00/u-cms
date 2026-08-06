import { z } from 'zod';

export const createSiteSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumeric with dashes'),
  name: z.string().min(1).max(255),
  domain: z.string().max(255).optional(),
  logoUrl: z.string().url().optional(),
  faviconUrl: z.string().url().optional(),
});

export type CreateSiteDto = z.infer<typeof createSiteSchema>;

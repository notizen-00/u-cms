import { z } from 'zod';

export const setupInitSchema = z.object({
  admin: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(1).max(255),
  }),
  site: z.object({
    slug: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumeric with dashes'),
    name: z.string().min(1).max(255),
    domain: z.string().max(255).optional(),
  }),
});

export type SetupInitDto = z.infer<typeof setupInitSchema>;

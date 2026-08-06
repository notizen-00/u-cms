import { z } from 'zod';

export const listMediaQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  type: z.enum(['image', 'document']).optional(),
  search: z.string().trim().min(1).max(255).optional(),
});

export type ListMediaQueryDto = z.infer<typeof listMediaQuerySchema>;

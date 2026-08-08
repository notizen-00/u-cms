import { z } from 'zod';

export const createMenuSchema = z.object({
  name: z.string().trim().min(1).max(150),
  locationId: z.string().trim().min(1).max(100).nullable().optional(),
});

export type CreateMenuDto = z.infer<typeof createMenuSchema>;

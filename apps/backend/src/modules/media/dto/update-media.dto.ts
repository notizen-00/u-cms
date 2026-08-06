import { z } from 'zod';

export const updateMediaSchema = z.object({
  altText: z.string().trim().max(500).optional(),
  caption: z.string().trim().max(1000).optional(),
});

export type UpdateMediaDto = z.infer<typeof updateMediaSchema>;

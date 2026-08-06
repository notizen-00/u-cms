import { z } from 'zod';

export const mergeTagSchema = z.object({
  targetTagId: z.string().uuid(),
});

export type MergeTagDto = z.infer<typeof mergeTagSchema>;

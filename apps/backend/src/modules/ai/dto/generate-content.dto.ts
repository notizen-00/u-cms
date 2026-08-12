import { z } from 'zod';

export const generateContentSchema = z.object({
  prompt: z.string().trim().min(1).max(4000),
});

export type GenerateContentDto = z.infer<typeof generateContentSchema>;

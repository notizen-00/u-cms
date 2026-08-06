import { z } from 'zod';
import { createTagSchema } from './create-tag.dto';

export const updateTagSchema = createTagSchema.partial();

export type UpdateTagDto = z.infer<typeof updateTagSchema>;

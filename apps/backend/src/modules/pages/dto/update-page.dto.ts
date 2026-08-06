import { z } from 'zod';
import { contentStatusEnum } from '../../../database/schema';
import { createPageSchema } from './create-page.dto';

export const updatePageSchema = createPageSchema.partial().extend({
  status: z.enum(contentStatusEnum.enumValues).optional(),
});

export type UpdatePageDto = z.infer<typeof updatePageSchema>;

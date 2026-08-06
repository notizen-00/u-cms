import { z } from 'zod';
import { contentStatusEnum } from '../../../database/schema';
import { createNewsSchema } from './create-news.dto';
import { categoryIdsSchema, tagIdsSchema } from './taxonomy-ids.schema';

export const updateNewsSchema = createNewsSchema
  .omit({ categoryIds: true, tagIds: true })
  .partial()
  .extend({
    status: z.enum(contentStatusEnum.enumValues).optional(),
    scheduledAt: z.coerce.date().nullable().optional(),
    categoryIds: categoryIdsSchema.optional(),
    tagIds: tagIdsSchema.optional(),
  });

export type UpdateNewsDto = z.infer<typeof updateNewsSchema>;

import { z } from 'zod';
import { MAX_BODY_MARKDOWN_LENGTH } from '../../../common/content-limits';
import { pageBlocksSchema } from './page-block.dto';

export const createPageSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumeric with dashes'),
  bodyMarkdown: z.string().max(MAX_BODY_MARKDOWN_LENGTH).optional(),
  blocks: pageBlocksSchema.optional(),
  parentId: z.string().uuid().optional(),
  isHomepage: z.boolean().optional(),
  order: z.number().int().optional(),
});

export type CreatePageDto = z.infer<typeof createPageSchema>;

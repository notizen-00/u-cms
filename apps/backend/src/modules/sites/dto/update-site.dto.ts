import { z } from 'zod';
import { createSiteSchema } from './create-site.dto';

export const updateSiteSchema = createSiteSchema.partial();

export type UpdateSiteDto = z.infer<typeof updateSiteSchema>;

import { z } from 'zod';
import { createMenuSchema } from './create-menu.dto';

export const updateMenuSchema = createMenuSchema.partial();

export type UpdateMenuDto = z.infer<typeof updateMenuSchema>;

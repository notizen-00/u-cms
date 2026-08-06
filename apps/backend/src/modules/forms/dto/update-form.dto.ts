import { z } from 'zod';
import { createFormSchema } from './create-form.dto';

export const updateFormSchema = createFormSchema.partial();

export type UpdateFormDto = z.infer<typeof updateFormSchema>;

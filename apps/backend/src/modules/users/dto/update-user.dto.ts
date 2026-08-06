import { z } from 'zod';

export const updateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  password: z.string().min(8).optional(),
  isSuperAdmin: z.boolean().optional(),
});

export type UpdateUserDto = z.infer<typeof updateUserSchema>;

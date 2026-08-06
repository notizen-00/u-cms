import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(255),
  isSuperAdmin: z.boolean().optional().default(false),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;

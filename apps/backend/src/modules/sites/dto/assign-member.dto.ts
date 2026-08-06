import { z } from 'zod';

export const assignMemberSchema = z.object({
  userId: z.string().uuid(),
  roleSlug: z.enum(['site_admin', 'editor', 'reviewer', 'author']),
});

export type AssignMemberDto = z.infer<typeof assignMemberSchema>;

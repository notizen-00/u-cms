import { z } from 'zod';

export const assignMemberSchema = z.object({
  userId: z.string().uuid(),
  roleSlug: z.enum([
    'site_admin',
    'publisher',
    'editor',
    'reviewer',
    'author',
    'contributor',
    'subscriber',
  ]),
});

export type AssignMemberDto = z.infer<typeof assignMemberSchema>;
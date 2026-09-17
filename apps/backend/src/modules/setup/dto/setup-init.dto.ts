import { z } from 'zod';

export const setupInitSchema = z.object({
  admin: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(1).max(255),
  }),
  site: z.object({
    name: z.string().min(1).max(255),
    // The public address is a hostname, never a URL or a path.
    domain: z
      .string()
      .trim()
      .toLowerCase()
      .max(253)
      .regex(/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/, 'domain must be a valid hostname'),
  }),
});

export type SetupInitDto = z.infer<typeof setupInitSchema>;

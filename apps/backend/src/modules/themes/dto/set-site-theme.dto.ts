import { z } from 'zod';

export const setSiteThemeSchema = z.object({
  themeId: z.string().min(1),
});

export type SetSiteThemeDto = z.infer<typeof setSiteThemeSchema>;

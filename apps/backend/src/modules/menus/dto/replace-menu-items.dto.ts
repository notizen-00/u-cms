import { z } from 'zod';

/**
 * The dashboard's menu editor builds the whole item tree client-side (drag
 * to reorder, indent/outdent to nest) and saves it in one shot — same UX as
 * WordPress's Menus screen. Items reference each other by a client-generated
 * `tempId` since new items have no database id yet; `parentTempId` encodes
 * nesting flatly rather than as a nested JSON tree, which keeps the payload
 * (and the service's insert loop) simple regardless of depth.
 */
export const menuItemInputSchema = z.object({
  tempId: z.string().trim().min(1),
  parentTempId: z.string().trim().min(1).nullable(),
  order: z.number().int().min(0),
  type: z.enum(['page', 'custom']),
  label: z.string().trim().min(1).max(255),
  pageId: z.string().uuid().nullable().optional(),
  url: z.string().trim().max(2000).nullable().optional(),
  newTab: z.boolean().optional().default(false),
  clickable: z.boolean().optional().default(true),
});

export const replaceMenuItemsSchema = z.object({
  items: z.array(menuItemInputSchema),
});

export type MenuItemInput = z.infer<typeof menuItemInputSchema>;
export type ReplaceMenuItemsDto = z.infer<typeof replaceMenuItemsSchema>;

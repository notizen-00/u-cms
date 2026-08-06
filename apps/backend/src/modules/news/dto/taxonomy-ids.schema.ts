import { z } from 'zod';

function uniqueUuidArray(label: string, maxItems: number) {
  return z
    .array(z.string().uuid())
    .max(maxItems)
    .refine((ids) => new Set(ids).size === ids.length, {
      message: `${label} must not contain duplicate IDs`,
    });
}

export const categoryIdsSchema = uniqueUuidArray('categoryIds', 20);
export const tagIdsSchema = uniqueUuidArray('tagIds', 50);

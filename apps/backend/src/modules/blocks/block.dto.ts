import type { PropertySchema } from '@unej-cms/sdk-ui';
import type { BlockSource, ResolvedBlock } from './block-registry.service';

/**
 * Wire shape of a block definition, using the vocabulary the Page Builder
 * speaks (docs/theme_aware_prd.md §6-§7): `type`/`label`/`schema` rather than
 * the SDK's internal `id`/`name`/`propertySchema`.
 *
 * `render` is deliberately absent: it holds the theme's actual component
 * source (raw `.svelte` text for this CMS's themes), which is both large and
 * server-only. The builder drives its editor entirely off `schema`, which is
 * exactly what keeps it independent of any theme's implementation.
 */
export interface BlockDto {
  readonly type: string;
  readonly label: string;
  readonly description?: string;
  readonly category: string;
  readonly icon?: string;
  readonly schema: PropertySchema;
  readonly slots?: readonly string[];
  readonly extends?: string;
  readonly fallback?: string;
  readonly source: BlockSource;
}

export function toBlockDto({ definition, source }: ResolvedBlock): BlockDto {
  return {
    type: String(definition.id),
    label: definition.name,
    description: definition.description,
    category: definition.category,
    icon: definition.icon,
    schema: definition.propertySchema,
    slots: definition.slots,
    extends: definition.extends,
    fallback: definition.fallback,
    source,
  };
}

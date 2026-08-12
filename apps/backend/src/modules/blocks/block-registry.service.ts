import { Injectable } from '@nestjs/common';
import { blockNamespace, CORE_BLOCK_NAMESPACE, type BlockDefinition } from '@unej-cms/sdk-ui';
import type { CmsPlugin } from '@unej-cms/sdk-plugin';
import { resolveTheme, THEME_CATALOG } from '../themes/theme-registry';
import { CORE_BLOCKS } from './core-blocks';

/** Where a block came from — drives grouping in the builder's block picker. */
export type BlockSource = 'core' | 'theme' | 'plugin';

export interface ResolvedBlock {
  readonly definition: BlockDefinition;
  readonly source: BlockSource;
}

/** One page's block type checked against a theme (docs/theme_aware_prd.md §11, §25). */
export interface BlockCompatibility {
  readonly type: string;
  readonly supported: boolean;
  /** Block that would render instead, resolved through the `fallback` chain. `null` when nothing can stand in for it. */
  readonly fallback: string | null;
}

/**
 * The Block Registry (docs/theme_aware_prd.md §9): the single place that knows
 * every block available in a given context — CMS core blocks, the active
 * theme's own blocks, and blocks contributed by active plugins.
 *
 * The Page Builder, preview, renderer and theme-compatibility checker all read
 * from here rather than hardcoding a block list, which is what lets a new theme
 * ship new blocks without any change to builder code.
 */
@Injectable()
export class BlockRegistryService {
  /** Core is theme-independent, so it's resolved once rather than per request. */
  private readonly coreByType: ReadonlyMap<string, BlockDefinition> = indexByType(CORE_BLOCKS);

  listCore(): readonly ResolvedBlock[] {
    return CORE_BLOCKS.map((definition) => ({ definition, source: 'core' as const }));
  }

  /**
   * Every block usable while `themeId` is active. Core first so a theme's own
   * blocks read as additions to a familiar base in the picker.
   *
   * A theme cannot override a core id — `defineTheme` rejects the `core.`
   * namespace outright — so no shadowing is possible here.
   */
  listForTheme(themeId: string, plugins: readonly CmsPlugin[] = []): readonly ResolvedBlock[] {
    const theme = resolveTheme(themeId);
    const themeBlocks = (theme.blocks ?? []).map((definition) => ({
      definition: definition as BlockDefinition,
      source: 'theme' as const,
    }));
    const pluginBlocks = plugins.flatMap((plugin) =>
      (plugin.ui?.blocks ?? []).map((definition) => ({
        definition,
        source: 'plugin' as const,
      })),
    );
    return [...this.listCore(), ...themeBlocks, ...pluginBlocks];
  }

  find(themeId: string, type: string, plugins: readonly CmsPlugin[] = []): BlockDefinition | undefined {
    return this.listForTheme(themeId, plugins).find(
      (block) => String(block.definition.id) === type,
    )?.definition;
  }

  isSupported(themeId: string, type: string, plugins: readonly CmsPlugin[] = []): boolean {
    return this.find(themeId, type, plugins) !== undefined;
  }

  /**
   * Walks a block's `fallback` chain until it reaches one the theme supports
   * (docs/theme_aware_prd.md §13), so content authored under another theme
   * still renders instead of vanishing.
   *
   * Returns `null` when nothing can stand in. Chain-walking is bounded by the
   * number of known blocks, so a `fallback` cycle between two theme blocks
   * terminates instead of hanging the request.
   */
  resolveFallback(
    themeId: string,
    type: string,
    plugins: readonly CmsPlugin[] = [],
  ): BlockDefinition | null {
    const available = indexByType(
      this.listForTheme(themeId, plugins).map((block) => block.definition),
    );
    const direct = available.get(type);
    if (direct) return direct;

    // The unsupported block's own definition isn't in `available` (that's why
    // it's unsupported), so its declared fallback has to come from the full
    // catalog of every block this CMS knows about.
    const seen = new Set<string>([type]);
    let current = this.findAnywhere(type);
    while (current?.fallback) {
      const next = current.fallback;
      if (seen.has(next)) return null;
      seen.add(next);
      const supported = available.get(next);
      if (supported) return supported;
      current = this.findAnywhere(next);
    }
    return null;
  }

  /**
   * Checks a page's block types against a theme — the data behind the
   * theme-switch warning and the compatibility report
   * (docs/theme_aware_prd.md §11, §25).
   */
  checkCompatibility(
    themeId: string,
    types: readonly string[],
    plugins: readonly CmsPlugin[] = [],
  ): readonly BlockCompatibility[] {
    const available = indexByType(
      this.listForTheme(themeId, plugins).map((block) => block.definition),
    );
    // Deduped so a page repeating the same block type reports it once.
    return [...new Set(types)].map((type) => {
      const supported = available.has(type);
      return {
        type,
        supported,
        fallback: supported
          ? null
          : (this.resolveFallback(themeId, type, plugins)?.id as string | undefined) ?? null,
      };
    });
  }

  /** Looks a block up across every installed theme, not just the active one — needed to read an unsupported block's own `fallback`. */
  private findAnywhere(type: string): BlockDefinition | undefined {
    if (blockNamespace(type) === CORE_BLOCK_NAMESPACE) {
      return this.coreByType.get(type);
    }
    return findThemeBlockAnywhere(type);
  }
}

function indexByType(blocks: readonly BlockDefinition[]): ReadonlyMap<string, BlockDefinition> {
  return new Map(blocks.map((block) => [String(block.id), block]));
}

/**
 * Deliberately searches *every installed theme*, not the active one: this is
 * only ever called for a block the active theme does not support, and the
 * whole point is to recover the definition that authored the content so its
 * `fallback` can be honoured.
 */
function findThemeBlockAnywhere(type: string): BlockDefinition | undefined {
  for (const meta of THEME_CATALOG) {
    const theme = resolveTheme(meta.id);
    const match = (theme.blocks ?? []).find((block) => String(block.id) === type);
    if (match) return match as BlockDefinition;
  }
  return undefined;
}

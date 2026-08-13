import type { CmsTheme } from '@unej-cms/sdk-theme';
import type { PageBlock } from '@unej-cms/sdk-content';
import type { BlockRegistryService } from '../../blocks/block-registry.service';
import { escapeHtmlAttribute } from './plugin-assets';

/** Ambient data every block component receives, mirroring what layouts get. */
export interface BlockRenderContext {
  readonly site: unknown;
  readonly theme: Record<string, unknown>;
  readonly menus: Record<string, unknown>;
  readonly news: readonly unknown[];
  readonly pages: readonly unknown[];
}

/** Compiles raw `.svelte` source and renders it — supplied by the site renderer, which owns the compile cache. */
export type RenderComponent = (
  source: string,
  filename: string,
  props: Record<string, unknown>,
) => Promise<{ head: string; body: string }>;

/**
 * Turns structured page content into HTML by handing each block to the active
 * theme's own component (docs/theme_aware_prd.md §17).
 *
 * The theme decides presentation entirely: this only picks *which* component
 * to use, and resolves the fallback chain when the theme has no renderer for
 * a block type — which is what lets a page authored under one theme still
 * display under another.
 */
export async function renderBlocks(
  blocks: readonly PageBlock[],
  theme: CmsTheme<string>,
  themeId: string,
  registry: BlockRegistryService,
  context: BlockRenderContext,
  renderComponent: RenderComponent,
  /**
   * Wraps each block's rendered fragment in a `data-cms-block-id` marker
   * (docs/theme_aware_prd.md §24) so the dashboard's Builder can tell which
   * DOM region came from which block, for click-to-select/insert in the
   * full-screen editor. `false` for the production static build (and the
   * default here) — production HTML must stay exactly what a theme's own
   * markup produces, with nothing extra. Only `PreviewRendererService`,
   * which exists solely to feed the Builder's editing iframe, passes `true`.
   */
  editable = false,
): Promise<string> {
  const renderers = theme.blockRenderers ?? {};
  const parts: string[] = [];

  for (const block of blocks) {
    const resolved = resolveRenderer(block.type, renderers, themeId, registry);
    if (!resolved) {
      // No renderer, and no fallback with one either. Skipping beats emitting
      // an unstyled section: the content is still safe in the database, and a
      // half-drawn block on a live site is worse than an absent one.
      continue;
    }

    const { head, body } = await renderComponent(resolved.source, `${resolved.type}.svelte`, {
      props: block.props ?? {},
      site: context.site,
      theme: context.theme,
      menus: context.menus,
      news: context.news,
      pages: context.pages,
    });
    // `head` is discarded on purpose — a block is a fragment inside a page
    // whose <head> the layout already owns.
    void head;
    parts.push(
      editable
        ? `<div data-cms-block-id="${escapeHtmlAttribute(block.id)}" data-cms-block-type="${escapeHtmlAttribute(resolved.type)}">${body}</div>`
        : body,
    );
  }

  return parts.join('\n');
}

/**
 * Finds the component to draw `type` with: the theme's own renderer first,
 * otherwise the renderer of whatever the registry resolves the fallback chain
 * to (docs/theme_aware_prd.md §13).
 */
function resolveRenderer(
  type: string,
  renderers: Readonly<Record<string, string>>,
  themeId: string,
  registry: BlockRegistryService,
): { type: string; source: string } | undefined {
  const direct = renderers[type];
  if (direct) return { type, source: direct };

  const fallback = registry.resolveFallback(themeId, type);
  if (!fallback) return undefined;

  const fallbackType = String(fallback.id);
  const source = renderers[fallbackType];
  return source ? { type: fallbackType, source } : undefined;
}

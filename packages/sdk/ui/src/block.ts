import { deepFreeze, toBlockId, type BlockID } from "@unej-cms/sdk-core";
import type { PropertySchema } from "./property-schema.js";

/**
 * Declarative Block description. `TRender` is intentionally opaque here —
 * the SDK is Runtime Independent, so the concrete render implementation
 * (a Svelte component reference, a React component, ...) is supplied and
 * typed by whichever Builder Runtime loads the block.
 *
 * A block's `id` is its public, stable type name and follows a
 * `<namespace>.<name>` convention: `core.*` for blocks the CMS itself
 * guarantees on every theme, `<themeName>.*` for blocks only available while
 * that theme is active, `plugin.*` for blocks contributed by a plugin.
 * Stored page content references blocks by this id, so it must never change
 * once published content uses it.
 */
export interface BlockDefinition<
  TProps extends PropertySchema = PropertySchema,
  TRender = unknown,
> {
  readonly id: BlockID;
  readonly name: string;
  readonly description?: string;
  readonly category: string;
  readonly icon?: string;
  readonly propertySchema: TProps;
  /** Named slots this block exposes for nested content. */
  readonly slots?: readonly string[];
  /**
   * Core block whose props this block is a superset of — e.g.
   * `faculty.video-hero` extends `core.hero`. Purely declarative: it tells
   * the compatibility checker that content authored for this block can be
   * expressed as the extended block, which is what makes `fallback`
   * conversion lossless for the shared props.
   */
  readonly extends?: string;
  /**
   * Block to render instead when this one is unavailable (its theme is no
   * longer active). Lets a page authored under one theme still display
   * under another rather than dropping the section — see the theme-switch
   * compatibility flow. Should normally be a `core.*` block, since those
   * are the only ones guaranteed to exist under every theme.
   */
  readonly fallback?: string;
  /**
   * Render implementation, when the declaring package ships one. Optional
   * because a block can be declared purely as *metadata* — the CMS's own
   * core catalog describes blocks the Builder Runtime already knows how to
   * render, so re-declaring a renderer there would just duplicate it.
   */
  readonly render?: TRender;
}

export interface DefineBlockInput<
  TProps extends PropertySchema,
  TRender,
> {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly category: string;
  readonly icon?: string;
  readonly propertySchema: TProps;
  readonly slots?: readonly string[];
  readonly extends?: string;
  readonly fallback?: string;
  readonly render?: TRender;
}

export function defineBlock<TProps extends PropertySchema, TRender>(
  input: DefineBlockInput<TProps, TRender>,
): BlockDefinition<TProps, TRender> {
  return deepFreeze({ ...input, id: toBlockId(input.id) });
}

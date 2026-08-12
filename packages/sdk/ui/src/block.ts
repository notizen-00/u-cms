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

/**
 * Namespace reserved for blocks the CMS itself guarantees exist under every
 * theme. Themes and plugins must use their own namespace, so a `core.*` id in
 * stored content always means the same thing no matter which theme is active.
 */
export const CORE_BLOCK_NAMESPACE = "core";

/** `core.hero` -> `core`; used to tell core / theme / plugin blocks apart. */
export function blockNamespace(id: string): string {
  const separator = id.indexOf(".");
  return separator === -1 ? "" : id.slice(0, separator);
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

export class BlockDefinitionError extends Error {
  constructor(
    blockId: string,
    public readonly issues: readonly { path: string; message: string }[],
  ) {
    super(
      `Invalid block definition for "${blockId}":\n` +
        issues.map((issue) => `  - ${issue.path}: ${issue.message}`).join("\n"),
    );
    this.name = "BlockDefinitionError";
  }
}

/**
 * The entry point a theme or plugin author calls to declare a block. Validates
 * eagerly and freezes the result, so a malformed definition fails at the
 * declaration — not later, somewhere far away, as a confusing render error.
 */
export function defineBlock<TProps extends PropertySchema, TRender>(
  input: DefineBlockInput<TProps, TRender>,
): BlockDefinition<TProps, TRender> {
  const issues: { path: string; message: string }[] = [];

  if (!input.id?.trim()) {
    issues.push({ path: "id", message: "is required" });
  } else if (!blockNamespace(input.id)) {
    // Without a namespace two packages can both declare `hero`, and whichever
    // registers second collides — or worse, silently changes what stored
    // content means. Block ids are permanent references in saved pages.
    issues.push({
      path: "id",
      message: 'must be namespaced as "<owner>.<block>", e.g. "faculty.video-hero"',
    });
  }
  if (!input.name?.trim()) issues.push({ path: "name", message: "is required" });
  if (!input.category?.trim()) issues.push({ path: "category", message: "is required" });
  if (input.fallback && input.fallback === input.id) {
    issues.push({ path: "fallback", message: "cannot fall back to itself" });
  }

  if (issues.length > 0) {
    throw new BlockDefinitionError(input.id || "<unknown>", issues);
  }

  return deepFreeze({ ...input, id: toBlockId(input.id) });
}

/**
 * Adds a block to a registry, keyed by its own id (docs/theme_aware_prd.md
 * §27). Thin on purpose — its value is that the key can never drift from the
 * definition it points at, which is exactly the bug that makes a registry
 * lookup return the wrong block.
 *
 * Throws `DuplicateRegistrationError` if the id is already taken, rather than
 * letting one package silently clobber another's block.
 */
export function registerBlock(
  registry: { register(key: BlockID, value: BlockDefinition): void },
  block: BlockDefinition,
): BlockDefinition {
  registry.register(block.id, block);
  return block;
}

import { deepFreeze, toLayoutId, type LayoutID } from "@unej-cms/sdk-core";

/**
 * A named template a theme registers (e.g. "layout", "home", "page").
 * `TRender` is intentionally opaque — the SDK is Runtime Independent, so the
 * concrete template representation (an Eta template string, a Svelte
 * component, ...) is supplied and typed by whichever Builder Runtime loads
 * the theme.
 */
export interface LayoutDefinition<TRender = unknown> {
  readonly id: LayoutID;
  readonly name: string;
  readonly description?: string;
  /** Named regions this layout exposes for widget placement. */
  readonly regions?: readonly string[];
  readonly render: TRender;
}

export interface DefineLayoutInput<TRender> {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly regions?: readonly string[];
  readonly render: TRender;
}

export function defineLayout<TRender>(
  input: DefineLayoutInput<TRender>,
): LayoutDefinition<TRender> {
  return deepFreeze({ ...input, id: toLayoutId(input.id) });
}

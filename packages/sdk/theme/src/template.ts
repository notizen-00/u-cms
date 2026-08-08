import { deepFreeze, toLayoutId, toTemplateId, type LayoutID, type TemplateID } from "@unej-cms/sdk-core";

/**
 * A named page template a theme exposes for editors to pick when creating a
 * page (e.g. "Default Page", "Full Width", "Landing Page"), each mapping to
 * one of the theme's own declared `layouts[].id`. `defineTheme()` validates
 * that mapping eagerly — a template referencing an unknown layout id fails
 * theme registration, same as declaring zero layouts does.
 */
export interface ThemeTemplateDefinition {
  readonly id: TemplateID;
  readonly name: string;
  readonly layout: LayoutID;
  readonly description?: string;
}

export interface DefineTemplateInput {
  readonly id: string;
  readonly name: string;
  readonly layout: string;
  readonly description?: string;
}

export function defineTemplate(input: DefineTemplateInput): ThemeTemplateDefinition {
  return deepFreeze({
    ...input,
    id: toTemplateId(input.id),
    layout: toLayoutId(input.layout),
  });
}

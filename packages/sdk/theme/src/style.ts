import { deepFreeze } from "@unej-cms/sdk-core";

export type CmsStyleKind = "css" | "js";

/**
 * A separate stylesheet/script a theme ships, rendered to its own file under
 * `asset/style/{css|js}/` in the built site and referenced from the "layout"
 * template via `it.styles.<id>` (a relative URL like `/asset/style/css/main.css`).
 *
 * `content` is an Eta template string so a theme can interpolate its own
 * site/settings variables (e.g. `<%= it.theme.primaryColor %>`), identical to
 * how `LayoutDefinition.render` works — the Builder Runtime (`EtaSiteRenderer`)
 * knows to interpret both as Eta strings here.
 */
export interface CmsStyle {
  readonly id: string;
  readonly kind: CmsStyleKind;
  readonly content: string;
}

export interface DefineStyleInput {
  readonly id: string;
  readonly kind: CmsStyleKind;
  readonly content: string;
}

export function defineStyle(input: DefineStyleInput): CmsStyle {
  return deepFreeze(input);
}

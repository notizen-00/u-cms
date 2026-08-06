import { deepFreeze, toMenuLocationId, type MenuLocationID } from "@unej-cms/sdk-core";

/** A named slot (e.g. "primary", "footer") the Dashboard lets editors assign a menu to. */
export interface MenuLocationDefinition {
  readonly id: MenuLocationID;
  readonly label: string;
  readonly description?: string;
}

export interface DefineMenuLocationInput {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
}

export function defineMenuLocation(
  input: DefineMenuLocationInput,
): MenuLocationDefinition {
  return deepFreeze({ ...input, id: toMenuLocationId(input.id) });
}

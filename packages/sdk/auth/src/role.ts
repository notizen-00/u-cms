import { deepFreeze, type PermissionKey } from "@unej-cms/sdk-core";

export interface RoleDefinition {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly permissions: readonly PermissionKey[];
}

export function defineRole(input: RoleDefinition): RoleDefinition {
  return deepFreeze(input);
}

import { deepFreeze, toPermissionKey, type PermissionKey } from "@unej-cms/sdk-core";

export interface PermissionDefinition {
  readonly key: PermissionKey;
  readonly label: string;
  readonly description?: string;
}

export interface DefinePermissionInput {
  readonly key: string;
  readonly label: string;
  readonly description?: string;
}

export function definePermission(input: DefinePermissionInput): PermissionDefinition {
  return deepFreeze({ ...input, key: toPermissionKey(input.key) });
}

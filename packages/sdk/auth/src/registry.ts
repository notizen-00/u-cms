import { createRegistry, type PermissionKey, type Registry } from "@unej-cms/sdk-core";
import type { PermissionDefinition } from "./permission.js";

export type PermissionRegistry = Registry<PermissionKey, PermissionDefinition>;

export const createPermissionRegistry = (): PermissionRegistry =>
  createRegistry({ name: "PermissionRegistry" });

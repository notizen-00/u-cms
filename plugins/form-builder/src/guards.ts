import { permissionGuard, type AuthContext, type Guard } from "@unej-cms/sdk-auth";
import { exportSubmissionsPermission, manageFormsPermission, viewSubmissionsPermission } from "./permissions.js";

/** Reusable access-control predicates a Runtime can compose into its own admin routes/UI. */
export const canManageForms: Guard<AuthContext> = permissionGuard(manageFormsPermission.key);
export const canViewSubmissions: Guard<AuthContext> = permissionGuard(viewSubmissionsPermission.key);
export const canExportSubmissions: Guard<AuthContext> = permissionGuard(exportSubmissionsPermission.key);

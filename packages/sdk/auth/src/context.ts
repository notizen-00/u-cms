import type { PermissionKey } from "@unej-cms/sdk-core";

/** Minimal principal shape a Runtime's real user model must satisfy. */
export interface AuthPrincipal {
  readonly id: string;
  readonly roles: readonly string[];
}

/**
 * What a plugin actually receives at runtime to make access-control
 * decisions. The Runtime implements this against its real user/session
 * model; the plugin only ever sees this narrow contract.
 */
export interface AuthContext {
  readonly currentUser: AuthPrincipal | null;
  hasPermission(key: PermissionKey): boolean;
  hasRole(roleId: string): boolean;
}

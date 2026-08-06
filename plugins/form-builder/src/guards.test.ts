import { describe, expect, it } from "vitest";
import type { AuthContext } from "@unej-cms/sdk-auth";
import { canManageForms, canViewSubmissions } from "./guards.js";

function authWithPermissions(...granted: readonly string[]): AuthContext {
  return {
    currentUser: { id: "user-1", roles: [] },
    hasPermission: (key) => granted.includes(key),
    hasRole: () => false,
  };
}

describe("form-builder guards", () => {
  it("canManageForms passes only when form-builder.manage is granted", async () => {
    expect(await canManageForms(authWithPermissions("form-builder.manage"))).toBe(true);
    expect(await canManageForms(authWithPermissions("form-builder.submissions.view"))).toBe(false);
  });

  it("canViewSubmissions passes only when form-builder.submissions.view is granted", async () => {
    expect(await canViewSubmissions(authWithPermissions("form-builder.submissions.view"))).toBe(true);
    expect(await canViewSubmissions(authWithPermissions("form-builder.manage"))).toBe(false);
  });
});

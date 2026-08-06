import { describe, expect, it } from "vitest";
import { toPermissionKey } from "@unej-cms/sdk-core";
import { composeGuards, permissionGuard, roleGuard } from "./guard.js";
import type { AuthContext } from "./context.js";

function fakeContext(permissions: string[], roles: string[]): AuthContext {
  return {
    currentUser: { id: "u1", roles },
    hasPermission: (key) => permissions.includes(key),
    hasRole: (roleId) => roles.includes(roleId),
  };
}

describe("composeGuards", () => {
  it("passes only when every guard passes", async () => {
    const guard = composeGuards(
      permissionGuard(toPermissionKey("post.edit")),
      roleGuard("editor"),
    );

    await expect(guard(fakeContext(["post.edit"], ["editor"]))).resolves.toBe(true);
    await expect(guard(fakeContext(["post.edit"], []))).resolves.toBe(false);
  });
});

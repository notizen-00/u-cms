import type { AuthContext } from "./context.js";

/** A predicate deciding whether an operation may proceed for the current auth context. */
export type Guard<TContext = AuthContext> = (
  context: TContext,
) => boolean | Promise<boolean>;

/** AND-composes guards: passes only if every guard passes, short-circuiting on the first failure. */
export function composeGuards<TContext = AuthContext>(
  ...guards: readonly Guard<TContext>[]
): Guard<TContext> {
  return async (context) => {
    for (const guard of guards) {
      if (!(await guard(context))) return false;
    }
    return true;
  };
}

/** OR-composes guards: passes if any guard passes, short-circuiting on the first success. */
export function anyGuard<TContext = AuthContext>(
  ...guards: readonly Guard<TContext>[]
): Guard<TContext> {
  return async (context) => {
    for (const guard of guards) {
      if (await guard(context)) return true;
    }
    return false;
  };
}

export function permissionGuard(key: Parameters<AuthContext["hasPermission"]>[0]): Guard<AuthContext> {
  return (context) => context.hasPermission(key);
}

export function roleGuard(roleId: string): Guard<AuthContext> {
  return (context) => context.hasRole(roleId);
}

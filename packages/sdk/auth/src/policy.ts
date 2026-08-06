import type { AuthContext } from "./context.js";

/** A resource-aware access check, e.g. "can this user edit this specific post". */
export type Policy<TResource, TContext = AuthContext> = (
  context: TContext,
  resource: TResource,
) => boolean | Promise<boolean>;

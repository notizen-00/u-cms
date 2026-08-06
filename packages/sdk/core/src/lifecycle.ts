/**
 * States every extension (plugin, theme, ...) moves through. The Runtime
 * owns the state machine; the SDK only names the states and the hook shape
 * so every domain package agrees on the same vocabulary.
 */
export type LifecycleState =
  | "installed"
  | "active"
  | "running"
  | "inactive"
  | "uninstalled";

export interface LifecycleTransition {
  readonly from: LifecycleState | null;
  readonly to: LifecycleState;
  readonly at: string;
}

export interface UpgradeInfo {
  readonly fromVersion: string;
  readonly toVersion: string;
}

/**
 * Generic lifecycle hook contract, parameterised over whatever context the
 * hosting domain provides (`PluginRuntimeContext`, a future `ThemeContext`, ...).
 * Every hook is optional and async so the Runtime can always `await` it uniformly.
 */
export interface LifecycleHooks<TContext> {
  onInstall?: (context: TContext) => void | Promise<void>;
  onActivate?: (context: TContext) => void | Promise<void>;
  onDeactivate?: (context: TContext) => void | Promise<void>;
  onUninstall?: (context: TContext) => void | Promise<void>;
  onUpgrade?: (context: TContext, info: UpgradeInfo) => void | Promise<void>;
  onDowngrade?: (context: TContext, info: UpgradeInfo) => void | Promise<void>;
}

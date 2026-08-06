import { createRegistry, type ActionID, type BlockID, type Registry, type TriggerID, type WidgetID } from "@unej-cms/sdk-core";
import type { BlockDefinition } from "./block.js";
import type { WidgetDefinition } from "./widget.js";
import type { ActionDefinition } from "./action.js";
import type { TriggerDefinition } from "./trigger.js";

export type BlockRegistry = Registry<BlockID, BlockDefinition>;
export type WidgetRegistry = Registry<WidgetID, WidgetDefinition>;
export type ActionRegistry = Registry<ActionID, ActionDefinition>;
export type TriggerRegistry = Registry<TriggerID, TriggerDefinition>;

export const createBlockRegistry = (): BlockRegistry =>
  createRegistry({ name: "BlockRegistry" });

export const createWidgetRegistry = (): WidgetRegistry =>
  createRegistry({ name: "WidgetRegistry" });

export const createActionRegistry = (): ActionRegistry =>
  createRegistry({ name: "ActionRegistry" });

export const createTriggerRegistry = (): TriggerRegistry =>
  createRegistry({ name: "TriggerRegistry" });

import { deepFreeze, toActionId, type ActionID } from "@unej-cms/sdk-core";
import type { PropertySchema } from "./property-schema.js";

export interface ActionDefinition<
  TInput extends PropertySchema = PropertySchema,
  THandler = unknown,
> {
  readonly id: ActionID;
  readonly label: string;
  readonly description?: string;
  readonly icon?: string;
  readonly inputSchema: TInput;
  readonly handler: THandler;
}

export interface DefineActionInput<TInput extends PropertySchema, THandler> {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly icon?: string;
  readonly inputSchema: TInput;
  readonly handler: THandler;
}

export function defineAction<TInput extends PropertySchema, THandler>(
  input: DefineActionInput<TInput, THandler>,
): ActionDefinition<TInput, THandler> {
  return deepFreeze({ ...input, id: toActionId(input.id) });
}

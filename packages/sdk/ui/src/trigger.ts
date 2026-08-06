import { deepFreeze, toTriggerId, type TriggerID } from "@unej-cms/sdk-core";
import type { PropertySchema } from "./property-schema.js";

/** A named event a Block/Widget exposes for Actions to bind to (e.g. `onClick`, `onSubmit`). */
export interface TriggerDefinition<TPayload extends PropertySchema = PropertySchema> {
  readonly id: TriggerID;
  readonly label: string;
  readonly description?: string;
  readonly payloadSchema?: TPayload;
}

export interface DefineTriggerInput<TPayload extends PropertySchema> {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly payloadSchema?: TPayload;
}

export function defineTrigger<TPayload extends PropertySchema>(
  input: DefineTriggerInput<TPayload>,
): TriggerDefinition<TPayload> {
  return deepFreeze({ ...input, id: toTriggerId(input.id) });
}

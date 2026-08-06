import { deepFreeze, toBlockId, type BlockID } from "@unej-cms/sdk-core";
import type { PropertySchema } from "./property-schema.js";

/**
 * Declarative Block description. `TRender` is intentionally opaque here —
 * the SDK is Runtime Independent, so the concrete render implementation
 * (a Svelte component reference, a React component, ...) is supplied and
 * typed by whichever Builder Runtime loads the block.
 */
export interface BlockDefinition<
  TProps extends PropertySchema = PropertySchema,
  TRender = unknown,
> {
  readonly id: BlockID;
  readonly name: string;
  readonly description?: string;
  readonly category: string;
  readonly icon?: string;
  readonly propertySchema: TProps;
  /** Named slots this block exposes for nested content. */
  readonly slots?: readonly string[];
  readonly render: TRender;
}

export interface DefineBlockInput<
  TProps extends PropertySchema,
  TRender,
> {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly category: string;
  readonly icon?: string;
  readonly propertySchema: TProps;
  readonly slots?: readonly string[];
  readonly render: TRender;
}

export function defineBlock<TProps extends PropertySchema, TRender>(
  input: DefineBlockInput<TProps, TRender>,
): BlockDefinition<TProps, TRender> {
  return deepFreeze({ ...input, id: toBlockId(input.id) });
}

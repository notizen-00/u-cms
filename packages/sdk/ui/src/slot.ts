import { deepFreeze, type BlockID } from "@unej-cms/sdk-core";

/** A named region inside a Block/Layout that other Blocks can be dropped into. */
export interface SlotDefinition {
  readonly name: string;
  readonly label?: string;
  readonly allowedBlocks?: readonly BlockID[];
  readonly multiple?: boolean;
}

export function defineSlot(input: SlotDefinition): SlotDefinition {
  return deepFreeze(input);
}

import { deepFreeze, toRegionId, type RegionID } from "@unej-cms/sdk-core";

/** A named placement area (header/footer/sidebar/...) widgets can be assigned to. */
export interface RegionDefinition {
  readonly id: RegionID;
  readonly label: string;
  readonly description?: string;
  readonly multiple?: boolean;
}

export interface DefineRegionInput {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly multiple?: boolean;
}

export function defineRegion(input: DefineRegionInput): RegionDefinition {
  return deepFreeze({ ...input, id: toRegionId(input.id) });
}

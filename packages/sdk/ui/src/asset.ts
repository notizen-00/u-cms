import { deepFreeze, toAssetId, type AssetID } from "@unej-cms/sdk-core";

export type AssetKind = "css" | "js" | "font" | "icon" | "image";

export interface AssetDefinition {
  readonly id: AssetID;
  readonly kind: AssetKind;
  readonly url: string;
  readonly integrity?: string;
  /** Only relevant for `js` assets: whether the script can be deferred. */
  readonly defer?: boolean;
}

export interface DefineAssetInput {
  readonly id: string;
  readonly kind: AssetKind;
  readonly url: string;
  readonly integrity?: string;
  readonly defer?: boolean;
}

export function defineAsset(input: DefineAssetInput): AssetDefinition {
  return deepFreeze({ ...input, id: toAssetId(input.id) });
}

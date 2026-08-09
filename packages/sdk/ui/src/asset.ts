import { deepFreeze, toAssetId, type AssetID } from "@unej-cms/sdk-core";

export type AssetKind = "css" | "js" | "font" | "icon" | "image";
export type AssetTarget = "site" | "editor" | "both";
export type AssetPlacement = "head" | "body";

interface AssetDefinitionBase {
  readonly id: AssetID;
  readonly kind: AssetKind;
  /** Runtime surface that may load this asset. Defaults to the public site only. */
  readonly target: AssetTarget;
  /** Document location used when the runtime renders CSS/JS tags. */
  readonly placement: AssetPlacement;
  readonly integrity?: string;
  /** Only relevant for `js` assets: whether the script can be deferred. */
  readonly defer?: boolean;
}

/** An asset already hosted at a URL. */
export interface ExternalAssetDefinition extends AssetDefinitionBase {
  readonly url: string;
  readonly content?: never;
}

/**
 * A CSS/JS asset shipped inside a plugin package. The Builder Runtime writes
 * `content` to the generated site instead of requiring a theme or CDN to host it.
 */
export interface ContentAssetDefinition extends AssetDefinitionBase {
  readonly content: string;
  readonly url?: never;
  readonly kind: "css" | "js";
}

export type AssetDefinition = ExternalAssetDefinition | ContentAssetDefinition;

interface DefineAssetInputBase {
  readonly id: string;
  readonly kind: AssetKind;
  readonly target?: AssetTarget;
  readonly placement?: AssetPlacement;
  readonly integrity?: string;
  readonly defer?: boolean;
}

export interface DefineExternalAssetInput extends DefineAssetInputBase {
  readonly url: string;
  readonly content?: never;
}

export interface DefineContentAssetInput extends DefineAssetInputBase {
  readonly content: string;
  readonly url?: never;
  readonly kind: "css" | "js";
}

export type DefineAssetInput = DefineExternalAssetInput | DefineContentAssetInput;

export class AssetDefinitionError extends Error {
  constructor(message: string) {
    super(`Invalid asset definition: ${message}`);
    this.name = "AssetDefinitionError";
  }
}

/**
 * Declares an immutable asset. Exactly one source (`url` or `content`) is
 * required; packaged content is deliberately limited to CSS/JS because those
 * are the asset kinds a document can load automatically.
 */
export function defineAsset(input: DefineAssetInput): AssetDefinition {
  if (!isSafeAssetId(input.id)) {
    throw new AssetDefinitionError(
      '"id" must start with an alphanumeric character and contain only alphanumerics, dots, underscores, or hyphens',
    );
  }

  const url = "url" in input ? input.url : undefined;
  const content = "content" in input ? input.content : undefined;
  const hasUrl = typeof url === "string" && url.trim().length > 0;
  const hasContent = typeof content === "string" && content.length > 0;

  if (hasUrl === hasContent) {
    throw new AssetDefinitionError('exactly one of "url" or "content" is required');
  }
  if (hasContent && input.kind !== "css" && input.kind !== "js") {
    throw new AssetDefinitionError('packaged "content" is only supported for css and js assets');
  }
  if (input.defer !== undefined && input.kind !== "js") {
    throw new AssetDefinitionError('"defer" is only supported for js assets');
  }

  const definition = {
    ...input,
    id: toAssetId(input.id),
    target: input.target ?? "site",
    placement: input.placement ?? (input.kind === "js" ? "body" : "head"),
  } as AssetDefinition;

  return deepFreeze(definition);
}

function isSafeAssetId(value: string): boolean {
  return /^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?$/.test(value);
}

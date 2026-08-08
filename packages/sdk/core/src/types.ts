/**
 * Nominal ("branded") type helper. Prevents e.g. a raw `string` from being
 * passed anywhere a `PluginID` is expected without an explicit cast through
 * one of the `to*Id` helpers below.
 */
export type Brand<TValue, TBrand extends string> = TValue & {
  readonly __brand: TBrand;
};

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

export type PluginID = Brand<string, "PluginID">;
export type SiteID = Brand<string, "SiteID">;
export type PermissionKey = Brand<string, "PermissionKey">;
export type BlockID = Brand<string, "BlockID">;
export type WidgetID = Brand<string, "WidgetID">;
export type ActionID = Brand<string, "ActionID">;
export type TriggerID = Brand<string, "TriggerID">;
export type ThemeID = Brand<string, "ThemeID">;
export type AssetID = Brand<string, "AssetID">;
export type MediaID = Brand<string, "MediaID">;
export type EventID = Brand<string, "EventID">;
export type LayoutID = Brand<string, "LayoutID">;
export type RegionID = Brand<string, "RegionID">;
export type MenuLocationID = Brand<string, "MenuLocationID">;
export type TemplateID = Brand<string, "TemplateID">;

function brand<TBrand extends string>(value: string): Brand<string, TBrand> {
  return value as Brand<string, TBrand>;
}

export const toPluginId = (value: string): PluginID => brand<"PluginID">(value);
export const toSiteId = (value: string): SiteID => brand<"SiteID">(value);
export const toPermissionKey = (value: string): PermissionKey =>
  brand<"PermissionKey">(value);
export const toBlockId = (value: string): BlockID => brand<"BlockID">(value);
export const toWidgetId = (value: string): WidgetID => brand<"WidgetID">(value);
export const toActionId = (value: string): ActionID => brand<"ActionID">(value);
export const toTriggerId = (value: string): TriggerID =>
  brand<"TriggerID">(value);
export const toThemeId = (value: string): ThemeID => brand<"ThemeID">(value);
export const toAssetId = (value: string): AssetID => brand<"AssetID">(value);
export const toMediaId = (value: string): MediaID => brand<"MediaID">(value);
export const toEventId = (value: string): EventID => brand<"EventID">(value);
export const toLayoutId = (value: string): LayoutID => brand<"LayoutID">(value);
export const toRegionId = (value: string): RegionID => brand<"RegionID">(value);
export const toMenuLocationId = (value: string): MenuLocationID =>
  brand<"MenuLocationID">(value);
export const toTemplateId = (value: string): TemplateID => brand<"TemplateID">(value);

/** Discriminated result type used throughout the SDK instead of throwing. */
export type Result<TValue, TError = ValidationIssue[]> =
  | { readonly ok: true; readonly value: TValue }
  | { readonly ok: false; readonly errors: TError };

export const ok = <TValue>(value: TValue): Result<TValue, never> => ({
  ok: true,
  value,
});

export const err = <TError>(errors: TError): Result<never, TError> => ({
  ok: false,
  errors,
});

export interface ValidationIssue {
  readonly path: string;
  readonly message: string;
}

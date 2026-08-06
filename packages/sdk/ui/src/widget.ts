import { deepFreeze, toWidgetId, type WidgetID } from "@unej-cms/sdk-core";
import type { PropertySchema } from "./property-schema.js";

export type WidgetSize = "small" | "medium" | "large" | "full";

export interface WidgetDefinition<
  TProps extends PropertySchema = PropertySchema,
  TRender = unknown,
> {
  readonly id: WidgetID;
  readonly name: string;
  readonly description?: string;
  readonly icon?: string;
  readonly defaultSize?: WidgetSize;
  readonly propertySchema: TProps;
  readonly render: TRender;
}

export interface DefineWidgetInput<TProps extends PropertySchema, TRender> {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly icon?: string;
  readonly defaultSize?: WidgetSize;
  readonly propertySchema: TProps;
  readonly render: TRender;
}

export function defineWidget<TProps extends PropertySchema, TRender>(
  input: DefineWidgetInput<TProps, TRender>,
): WidgetDefinition<TProps, TRender> {
  return deepFreeze({ ...input, id: toWidgetId(input.id) });
}

import { deepFreeze } from "@unej-cms/sdk-core";

interface PropertyFieldBase {
  readonly label: string;
  readonly description?: string;
  readonly required?: boolean;
}

export interface StringField extends PropertyFieldBase {
  readonly type: "string";
  readonly default?: string;
  readonly placeholder?: string;
}

export interface NumberField extends PropertyFieldBase {
  readonly type: "number";
  readonly default?: number;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
}

export interface BooleanField extends PropertyFieldBase {
  readonly type: "boolean";
  readonly default?: boolean;
}

export interface SelectField extends PropertyFieldBase {
  readonly type: "select";
  readonly options: readonly { readonly label: string; readonly value: string }[];
  readonly default?: string;
}

export interface ColorField extends PropertyFieldBase {
  readonly type: "color";
  readonly default?: string;
}

export interface MediaField extends PropertyFieldBase {
  readonly type: "media";
  readonly accept?: readonly string[];
}

export interface RichTextField extends PropertyFieldBase {
  readonly type: "richtext";
  readonly default?: string;
}

export interface ArrayField extends PropertyFieldBase {
  readonly type: "array";
  readonly items: PropertySchema;
}

export interface ObjectField extends PropertyFieldBase {
  readonly type: "object";
  readonly properties: PropertySchema;
}

export type PropertyFieldSchema =
  | StringField
  | NumberField
  | BooleanField
  | SelectField
  | ColorField
  | MediaField
  | RichTextField
  | ArrayField
  | ObjectField;

/** A named set of configurable properties, driving the Dashboard Inspector UI. */
export type PropertySchema = Readonly<Record<string, PropertyFieldSchema>>;

export function definePropertySchema<TSchema extends PropertySchema>(
  schema: TSchema,
): TSchema {
  return deepFreeze(schema);
}

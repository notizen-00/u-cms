import { BadRequestException } from '@nestjs/common';
import { z, ZodError, type ZodTypeAny } from 'zod';
import type { PropertyFieldSchema, PropertySchema } from '@unej-cms/sdk-ui';

function fieldToZod(field: PropertyFieldSchema): ZodTypeAny {
  switch (field.type) {
    case 'string':
    case 'richtext':
    case 'media':
      return z.string();
    case 'number': {
      let schema = z.number();
      if (field.min !== undefined) schema = schema.min(field.min);
      if (field.max !== undefined) schema = schema.max(field.max);
      return schema;
    }
    case 'boolean':
      return z.boolean();
    case 'select': {
      const values = field.options.map((option) => option.value);
      return values.length > 0 ? z.enum(values as [string, ...string[]]) : z.string();
    }
    case 'color':
      return z.string().regex(/^#[0-9a-fA-F]{3,8}$/, 'Warna harus berupa kode hex, mis. #075985');
    case 'array':
      return z.array(schemaToZodObject(field.items));
    case 'object':
      return schemaToZodObject(field.properties);
  }
}

function schemaToZodObject(schema: PropertySchema) {
  const shape: Record<string, ZodTypeAny> = {};
  for (const [key, field] of Object.entries(schema)) {
    const fieldSchema = fieldToZod(field);
    shape[key] = field.required ? fieldSchema : fieldSchema.optional();
  }
  return z.object(shape);
}

/** Validates raw settings values against a theme's `PropertySchema`, throwing the same 400 shape as `ZodValidationPipe`. */
export function validateThemeSettingsValues(
  schema: PropertySchema,
  values: unknown,
): Record<string, unknown> {
  try {
    return schemaToZodObject(schema).parse(values);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new BadRequestException(
        error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      );
    }
    throw error;
  }
}

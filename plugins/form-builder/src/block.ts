import { defineBlock, definePropertySchema } from "@unej-cms/sdk-ui";

const formFieldItemSchema = definePropertySchema({
  key: { type: "string", label: "Field Key", required: true, placeholder: "e.g. full_name" },
  label: { type: "string", label: "Label", required: true },
  type: {
    type: "select",
    label: "Field Type",
    default: "text",
    options: [
      { label: "Text", value: "text" },
      { label: "Email", value: "email" },
      { label: "Number", value: "number" },
      { label: "Textarea", value: "textarea" },
      { label: "Select", value: "select" },
      { label: "Checkbox", value: "checkbox" },
    ],
  },
  required: { type: "boolean", label: "Required", default: false },
  placeholder: { type: "string", label: "Placeholder" },
  options: {
    type: "string",
    label: "Options (comma-separated)",
    description: "Only used when Field Type is Select",
  },
});

export const formBlockPropertySchema = definePropertySchema({
  title: { type: "string", label: "Title", placeholder: "Contact Us" },
  fields: {
    type: "array",
    label: "Fields",
    items: formFieldItemSchema,
  },
  submitLabel: { type: "string", label: "Submit Button Label", default: "Send" },
  successMessage: {
    type: "string",
    label: "Success Message",
    default: "Thanks! Your submission has been received.",
  },
});

/**
 * The Block a site editor drags into a page. `render` names the component
 * the Builder Runtime resolves it to (Runtime Independent principle — this
 * package never imports a Svelte/React renderer directly).
 */
export const formBlock = defineBlock({
  id: "unej.form-builder.form",
  name: "Form",
  description: "A configurable form: add fields, then bind submissions to storage.",
  category: "forms",
  icon: "list-checks",
  propertySchema: formBlockPropertySchema,
  render: "FormBlockRenderer",
});

import { defineTrigger, definePropertySchema } from "@unej-cms/sdk-ui";

const submitPayloadSchema = definePropertySchema({
  formId: { type: "string", label: "Form ID" },
});

export const onSubmitSuccessTrigger = defineTrigger({
  id: "unej.form-builder.submit-success",
  label: "On Submit Success",
  description: "Fires after a form submission passes validation and is stored.",
  payloadSchema: submitPayloadSchema,
});

export const onSubmitErrorTrigger = defineTrigger({
  id: "unej.form-builder.submit-error",
  label: "On Submit Error",
  description: "Fires when a form submission fails field validation.",
  payloadSchema: submitPayloadSchema,
});

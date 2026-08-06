import { definePermission, defineRole } from "@unej-cms/sdk-auth";

export const manageFormsPermission = definePermission({
  key: "form-builder.manage",
  label: "Manage Forms",
  description: "Create, edit, and delete form definitions.",
});

export const viewSubmissionsPermission = definePermission({
  key: "form-builder.submissions.view",
  label: "View Submissions",
  description: "View submitted form entries.",
});

export const exportSubmissionsPermission = definePermission({
  key: "form-builder.submissions.export",
  label: "Export Submissions",
  description: "Export submitted form entries as CSV.",
});

export const formManagerRole = defineRole({
  id: "form-builder.manager",
  name: "Form Manager",
  description: "Can manage forms and review submissions for a site.",
  permissions: [
    manageFormsPermission.key,
    viewSubmissionsPermission.key,
    exportSubmissionsPermission.key,
  ],
});

import { describe, expect, it } from "vitest";
import { createMemoryStorage } from "./test-utils.js";
import { deleteForm, getForm, listForms, listSubmissions, recordSubmission, saveForm } from "./storage.js";

describe("form storage", () => {
  it("creates then updates a form, keeping its id and createdAt stable", async () => {
    const storage = createMemoryStorage();

    const created = await saveForm(storage, "site-1", {
      title: "Contact",
      fields: [{ key: "name", label: "Name", type: "text", required: true }],
    });
    expect(created.id).toBeTruthy();

    const updated = await saveForm(storage, "site-1", {
      id: created.id,
      title: "Contact Us",
      fields: created.fields,
    });

    expect(updated.id).toBe(created.id);
    expect(updated.title).toBe("Contact Us");
    expect(updated.createdAt).toBe(created.createdAt);

    const forms = await listForms(storage, "site-1");
    expect(forms).toHaveLength(1);
    expect(forms[0]?.title).toBe("Contact Us");
  });

  it("isolates forms per site", async () => {
    const storage = createMemoryStorage();
    await saveForm(storage, "site-1", { title: "Site 1 form", fields: [] });
    await saveForm(storage, "site-2", { title: "Site 2 form", fields: [] });

    expect(await listForms(storage, "site-1")).toHaveLength(1);
    expect(await listForms(storage, "site-2")).toHaveLength(1);
  });

  it("records and lists submissions for a form", async () => {
    const storage = createMemoryStorage();
    const form = await saveForm(storage, "site-1", {
      title: "Contact",
      fields: [{ key: "name", label: "Name", type: "text", required: true }],
    });

    await recordSubmission(storage, "site-1", form.id, { name: "Ada" });
    await recordSubmission(storage, "site-1", form.id, { name: "Grace" });

    const submissions = await listSubmissions(storage, "site-1", form.id);
    expect(submissions).toHaveLength(2);
    expect(submissions.map((submission) => submission.data.name)).toEqual(["Ada", "Grace"]);
  });

  it("deletes a form and its submissions", async () => {
    const storage = createMemoryStorage();
    const form = await saveForm(storage, "site-1", { title: "Contact", fields: [] });
    await recordSubmission(storage, "site-1", form.id, {});

    await deleteForm(storage, "site-1", form.id);

    expect(await getForm(storage, "site-1", form.id)).toBeUndefined();
    expect(await listSubmissions(storage, "site-1", form.id)).toHaveLength(0);
  });
});

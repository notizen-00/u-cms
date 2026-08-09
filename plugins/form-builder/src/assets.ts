import { defineAsset } from "@unej-cms/sdk-ui";

/**
 * Public styles owned by Form Builder. Theme tokens are optional integration
 * points, each with a standalone fallback so a theme never has to provide
 * `.cms-form-*` rules for the plugin to remain usable.
 */
export const FORM_BUILDER_STYLES = `
.cms-form-embed {
  --cms-form-accent: var(--primary, var(--theme-primary, #075985));
  --cms-form-background: var(--theme-surface, var(--theme-background, #ffffff));
  --cms-form-foreground: var(--theme-foreground, #111827);
  --cms-form-border: var(--theme-line, var(--theme-muted, #dfe5ed));
  box-sizing: border-box;
  width: 100%;
  max-width: 35rem;
  margin: 2rem 0;
  padding: clamp(1.25rem, 3vw, 1.75rem);
  color: var(--cms-form-foreground);
  background: var(--cms-form-background);
  border: 1px solid var(--cms-form-border);
  border-radius: var(--theme-radius-card, 0.5rem);
}
.cms-form-embed *,
.cms-form-embed *::before,
.cms-form-embed *::after { box-sizing: border-box; }
.cms-form-title { margin: 0 0 1.25rem; font-size: 1.25rem; font-weight: 800; line-height: 1.3; }
.cms-form-field { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1rem; }
.cms-form-field label { font-size: 0.9rem; font-weight: 600; }
.cms-form-field input,
.cms-form-field textarea,
.cms-form-field select {
  width: 100%;
  min-width: 0;
  padding: 0.65rem 0.75rem;
  color: inherit;
  background: var(--theme-background, #ffffff);
  border: 1px solid var(--cms-form-border);
  border-radius: min(var(--theme-radius-button, 0.375rem), 0.625rem);
  font: inherit;
}
.cms-form-field input:focus,
.cms-form-field textarea:focus,
.cms-form-field select:focus {
  border-color: var(--cms-form-accent);
  outline: 2px solid color-mix(in srgb, var(--cms-form-accent) 35%, transparent);
  outline-offset: 1px;
}
.cms-form-field textarea { resize: vertical; }
.cms-form-field-checkbox label { display: flex; flex-direction: row; align-items: center; gap: 0.5rem; font-weight: 500; }
.cms-form-field-checkbox input { width: auto; }
.cms-form-submit {
  padding: 0.7rem 1.4rem;
  color: #ffffff;
  background: var(--cms-form-accent);
  border: 0;
  border-radius: var(--theme-radius-button, 0.375rem);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
.cms-form-submit:disabled { cursor: default; opacity: 0.6; }
.cms-form-status { margin: 0.85rem 0 0; font-size: 0.9rem; font-weight: 600; }
.cms-form-status-success { color: #15803d; }
.cms-form-status-error { color: #b91c1c; }
`;

/** Dependency-free public submit behavior, loaded only while this plugin is active. */
export const FORM_BUILDER_SCRIPT = `
document.addEventListener('submit', function (event) {
  var form = event.target;
  if (!form.classList || !form.classList.contains('cms-form-embed')) return;
  event.preventDefault();

  var status = form.querySelector('.cms-form-status');
  var button = form.querySelector('.cms-form-submit');
  var payload = {};
  new FormData(form).forEach(function (value, key) { payload[key] = value; });
  Array.prototype.forEach.call(form.querySelectorAll('input[type="checkbox"]'), function (checkbox) {
    payload[checkbox.name] = checkbox.checked;
  });

  if (button) button.disabled = true;

  fetch(form.action, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(function (response) {
      return response.json().catch(function () { return null; }).then(function (body) {
        return { ok: response.ok, body: body };
      });
    })
    .then(function (result) {
      if (button) button.disabled = false;
      if (!status) return;
      status.hidden = false;
      if (result.ok) {
        form.reset();
        status.className = 'cms-form-status cms-form-status-success';
        status.textContent = status.getAttribute('data-success-message') || 'Terima kasih.';
      } else {
        status.className = 'cms-form-status cms-form-status-error';
        var body = result.body;
        var message = Array.isArray(body)
          ? body.map(function (issue) { return issue.message; }).join(', ')
          : (body && body.message) || 'Terjadi kesalahan. Coba lagi.';
        status.textContent = message;
      }
    })
    .catch(function () {
      if (button) button.disabled = false;
      if (status) {
        status.hidden = false;
        status.className = 'cms-form-status cms-form-status-error';
        status.textContent = 'Tidak bisa terhubung ke server. Coba lagi.';
      }
    });
});
`;

export const formBuilderStyleAsset = defineAsset({
  id: "styles",
  kind: "css",
  content: FORM_BUILDER_STYLES,
  target: "site",
  placement: "head",
});

export const formBuilderScriptAsset = defineAsset({
  id: "runtime",
  kind: "js",
  content: FORM_BUILDER_SCRIPT,
  target: "site",
  placement: "body",
});

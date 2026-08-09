// Bare-specifier re-exports, resolved from apps/backend's own node_modules —
// the same resolution base modules/builder/render/svelte-site-renderer.ts's
// dynamic `import('svelte/compiler')`/`import('svelte/server')` rely on to
// bridge Svelte 5's ESM-only packages into this CJS backend. Resolving these
// via `require.resolve` from elsewhere (e.g. createRequire) picks a
// different, CJS-conditioned file with no usable named exports — this file
// exists so ../../scripts/theme-dev.mjs (the root theme live-preview server)
// gets the exact same modules the real SSR renderer does, without
// duplicating apps/backend's render pipeline.
export { compile } from 'svelte/compiler';
export { render } from 'svelte/server';
export { Eta } from 'eta';
export { default as MarkdownIt } from 'markdown-it';

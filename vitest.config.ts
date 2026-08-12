import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      // Backend splits its suites by filename: `.spec.ts` runs under Jest,
      // `.test.ts` here — the ones needing real ESM dynamic `import()` (Svelte
      // 5 is ESM-only), which Jest can't do without --experimental-vm-modules.
      "apps/backend/src/**/*.test.ts",
      // The dashboard has its own vitest.config.ts for focused runs, but
      // vitest itself is only installed at the workspace root — so without
      // this entry `pnpm test` silently skipped every dashboard test.
      "apps/dashboard/src/**/*.test.ts",
      "packages/**/src/**/*.test.ts",
      "plugins/**/src/**/*.test.ts",
      "themes/**/src/**/*.test.ts",
    ],
    environment: "node",
  },
});

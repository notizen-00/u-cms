import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "apps/backend/src/modules/builder/render/content-renderer.test.ts",
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

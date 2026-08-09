import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "apps/backend/src/modules/builder/render/content-renderer.test.ts",
      "packages/**/src/**/*.test.ts",
      "plugins/**/src/**/*.test.ts",
      "themes/**/src/**/*.test.ts",
    ],
    environment: "node",
  },
});

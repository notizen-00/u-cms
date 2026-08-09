import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  target: "es2022",
  dts: true,
  sourcemap: true,
  // Keep dependency declarations available while parallel dev watchers restart.
  clean: !options.watch,
  minify: false,
  external: ["sharp"],
}));

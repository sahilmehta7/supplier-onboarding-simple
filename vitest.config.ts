import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: "happy-dom",
    include: [
      "tests/**/*.test.ts",
      "supplier_capabilities/tests/**/*.test.ts",
    ],
    exclude: ["node_modules/**"],
    setupFiles: ["tests/setup/vitest.setup.ts"],
  },
});

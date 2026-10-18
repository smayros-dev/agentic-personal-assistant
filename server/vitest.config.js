import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    env: {
      DB_PATH: ":memory:",
      NODE_ENV: "test",
      VECTOR_DB: "chroma",
      CHROMA_URL: "http://localhost:8000",
      CHROMA_COLLECTION: "test",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: ["node_modules/", "dist/", "*.config.js"],
    },
  },
});

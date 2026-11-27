// Contract tests talk to Pact's mock server over real HTTP, so they run
// without the MSW setup the unit and component tests use.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["contract/**/*.pact.test.ts"],
    fileParallelism: false,
  },
});

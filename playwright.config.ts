import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:8765", screenshot: "only-on-failure", trace: "retain-on-failure", launchOptions: { ...(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {}), args: ["--disable-crashpad", "--disable-crash-reporter", "--noerrdialogs"], env: { ...process.env, HOME: "/tmp/playwright-home" } } },
  webServer: [{
    command: "node tests/serve-registry-fixture.mjs",
    url: "http://127.0.0.1:8766/health",
    reuseExistingServer: !process.env.CI,
    timeout: 15_000,
  }, {
    command: "npm run dev",
    url: "http://127.0.0.1:8765/ide",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Keep product-page browser tests deterministic and independent of the
    // external GitHub mirror. The checked-in snapshot is the same public,
    // attested data consumed by the production fallback.
    env: {
      ...process.env,
      PUBLIC_REGISTRY_SNAPSHOT_URL: "http://127.0.0.1:8766/registry-snapshot.json",
      PLAYWRIGHT_TEST_FIXTURES: "1",
    },
  }],
});

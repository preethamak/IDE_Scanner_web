import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:8765", screenshot: "only-on-failure", trace: "retain-on-failure", launchOptions: { ...(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {}), args: ["--disable-crashpad", "--disable-crash-reporter", "--noerrdialogs"], env: { ...process.env, HOME: "/tmp/playwright-home" } } },
  webServer: { command: "npm run dev", url: "http://127.0.0.1:8765/ide", reuseExistingServer: true, timeout: 120_000 },
});

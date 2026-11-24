import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests (brief: Day 7 end-to-end testing, Day 12 testing across devices).
 * Starts the API in demo mode with a throwaway data file, and the Next.js app.
 *   npm run test:e2e
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "off",
    // Use a pre-installed Chromium when PW_CHROMIUM_PATH is set (e.g. in sandboxes).
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /responsive\.spec\.ts/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /responsive\.spec\.ts/ },
  ],
  webServer: [
    {
      command: "npm --prefix ../backend start",
      url: "http://localhost:4000/api/health",
      reuseExistingServer: true,
      env: { PORT: "4000", DATA_FILE: "../backend/data/e2e-db.json", AI_PROVIDER: "demo", SEED_DEMO: "true", RATE_LIMIT_MESSAGES_PER_MIN: "200" },
    },
    {
      command: "npm run build && npm run start",
      url: "http://localhost:3000",
      reuseExistingServer: true,
      timeout: 180_000,
    },
  ],
});

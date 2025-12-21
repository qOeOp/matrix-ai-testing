import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
dotenv.config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  timeout: 10 * 60 * 1000,
  /* Run scenario in files in parallel */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: Boolean(process.env.CI),
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel scenario on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    // [process.env.CI ? "line" : "list"],
    ["@midscene/web/playwright-reporter"],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://127.0.0.1:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
    headless: false,
    // 添加视口和全屏配置
    viewport: null,           // ❗ 关键：设置为 null 会使用最大可用尺寸
    launchOptions: {
      args: [
        '--start-maximized',  // Chrome/Chromium 最大化启动
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--window-size=1920,1200' // 可选：设置具体窗口尺寸
      ],
    },
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

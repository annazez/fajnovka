import { defineConfig, devices } from '@playwright/test';

const PORT = 4321;
const stage = { width: 1920, height: 1080 };

/**
 * End-to-end tests run against the test build of the site (`npm run build:test` first).
 * The test build asks for the live data of DPO as the production site does, and each test gives the answer itself.
 * Three engines cover Chrome, Firefox and Safari, on a projector-size screen and on a phone.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  snapshotPathTemplate: '{testDir}/__snapshots__/{testFileName}/{arg}-{projectName}{ext}',
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.004, animations: 'disabled' },
  },
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'on-first-retry',
  },
  webServer: {
    // `--ignore-lock` keeps the server in the foreground. Without it, Astro starts a background server
    // when an AI agent runs the tests, and Playwright sees that its command has ended.
    command: `npm run preview -- --host 127.0.0.1 --port ${PORT} --ignore-lock`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: stage } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], viewport: stage } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], viewport: stage } },
    { name: 'phone-chromium', use: { ...devices['Pixel 7'] } },
    { name: 'phone-webkit', use: { ...devices['iPhone 14'] } },
    // Firefox has no mobile emulation in Playwright: a touch screen of phone size is the nearest thing.
    {
      name: 'phone-firefox',
      use: { ...devices['Desktop Firefox'], viewport: { width: 390, height: 844 }, hasTouch: true },
    },
  ],
});

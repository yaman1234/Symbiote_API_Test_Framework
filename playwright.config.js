const { defineConfig } = require('@playwright/test');
const { env } = require('./config/env');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30 * 1000,
  expect: {
    timeout: 5 * 1000
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Optional: PW_WORKERS=1 reduces flakes when many specs hit send-otp for the same QA user in parallel.
  workers:
    process.env.PW_WORKERS !== undefined && process.env.PW_WORKERS !== ''
      ? Number(process.env.PW_WORKERS)
      : process.env.CI
        ? 1
        : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['junit', { outputFile: 'reports/junit/results.xml' }],
    ['json', { outputFile: 'reports/json/results.json' }]
  ],
  outputDir: 'reports/test-results',
  use: {
    baseURL: env.BASE_URL,
    extraHTTPHeaders: {
      Accept: 'application/json'
    }
  },
  grepInvert: process.env.SKIP_TAG ? new RegExp(process.env.SKIP_TAG) : undefined
});

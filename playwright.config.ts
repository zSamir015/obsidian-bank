import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  repeatEach: process.env.CI ? 10 : 1,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  outputDir: 'test-results',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4173/obsidian-bank/',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    reducedMotion: 'reduce',
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173/obsidian-bank/',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
})

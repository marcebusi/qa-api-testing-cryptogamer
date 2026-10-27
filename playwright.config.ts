import { defineConfig } from '@playwright/test'
import * as dotenv from 'dotenv'

dotenv.config()

export default defineConfig({
  globalSetup: './global-setup.ts',
  testDir: './api-tests',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.API_URL || 'http://localhost:3001',
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  },
})

import { defineConfig, devices } from '@playwright/test'

/** Браузерный шов: настоящий сервер, настоящий API, без подмены ответов. */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    // Сервер раздаёт собранный фронтенд из web/dist.
    command: 'npm run build -w web && node server/src/index.ts',
    url: 'http://127.0.0.1:3100/api/health',
    env: { PORT: '3100' },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})

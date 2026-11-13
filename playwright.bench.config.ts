import { defineConfig } from '@playwright/test';

/** The frame times in the browser (^928): `bun run frames` prints them. */
export default defineConfig({
  testDir: 'bench',
  workers: 1,
  timeout: 600_000,
  use: { baseURL: 'http://localhost:5173', viewport: { width: 1200, height: 900 } },
  webServer: { command: 'bun run dev', url: 'http://localhost:5173', reuseExistingServer: true },
});

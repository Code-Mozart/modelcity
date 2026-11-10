import { defineConfig } from '@playwright/test';

/** The pictures of the testing ground of the junctions (^1018): `bun run shots` writes them to `shots/out`. */
export default defineConfig({
  testDir: 'shots',
  workers: 1,
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 1200, height: 900 },
    deviceScaleFactor: 2,
  },
  webServer: { command: 'bun run dev', url: 'http://localhost:5173', reuseExistingServer: true },
});

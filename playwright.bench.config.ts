import { defineConfig } from '@playwright/test';

/**
 * The measurements of the chunked map in a real browser (`bun run bench`, ^1249): never part of CI.
 * They run on the production build (a dev build is much slower in the reactivity of Svelte), with
 * the test hook switched on.
 */
export default defineConfig({
  testDir: 'bench',
  timeout: 40 * 60 * 1000,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4174',
    viewport: { width: 1200, height: 800 },
    launchOptions: { args: ['--enable-precise-memory-info'] },
  },
  webServer: {
    command: 'VITE_TEST_HOOK=1 bun run build && bunx vite preview --port 4174 --strictPort',
    url: 'http://localhost:4174',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});

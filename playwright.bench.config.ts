import { defineConfig } from '@playwright/test';

/**
 * The measurements of the chunked map in a real browser (`bun run bench`, ^1249, ^1251): never part
 * of CI. They run on the production build (a dev build is much slower in the reactivity of
 * Svelte), with the test hook switched on and the names of the functions kept. The browser is
 * started by the test itself (`bench/report.spec.ts`), so that the data is on disk.
 */
export default defineConfig({
  testDir: 'bench',
  workers: 1,
  reporter: 'list',
  webServer: {
    command:
      'bunx vite build --minify false && bunx vite preview --port 4174 --strictPort --base /modelcity/',
    env: { VITE_TEST_HOOK: '1' },
    url: 'http://localhost:4174/modelcity/',
    reuseExistingServer: false,
    timeout: 180_000,
  },
});

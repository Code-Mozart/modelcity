import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// The published app lives under the repository name (GitHub Pages project site, ^175); the dev server and the tests stay at `/`.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/modelcity/' : '/',
  plugins: [svelte()],
  test: { include: ['src/**/*.test.ts'] },
}));

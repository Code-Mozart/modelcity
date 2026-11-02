import { expect, type Page } from '@playwright/test';
import type { App } from './app';

/** Helpers of the scenarios about projects (^82, ^148, ^168, ^189). */
export const modalOf = (page: Page) => page.getByRole('dialog', { name: 'Projects' });

/** Draw a road and wait until it is saved as the n-th project of the browser. */
export async function projectWithRoad(app: App, count: number) {
  await app.drawRoad();
  await expect.poll(async () => (await app.stored()).length).toBe(count);
  await expect.poll(async () => (await app.stored()).every((p) => p.nodes.length === 2)).toBe(true);
}

/** Open the project that is not the open one (two projects in the list). */
export async function otherProject(page: Page) {
  const card = modalOf(page)
    .locator('li.card:not(.current)')
    .filter({ hasText: 'Untitled project' });
  await card.getByRole('button').first().click();
}

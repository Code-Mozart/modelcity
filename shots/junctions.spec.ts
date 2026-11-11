import { test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { GROUND_CASES, junctionGround } from '../src/lib/testing/junctionGround';

/**
 * A picture of every case of the testing ground of the junctions, with the debug layer on and, of
 * the first view of each case, one in view mode with the markings only (^1018, ^1025):
 * `bun run shots` writes them and an index to `shots/out`; the CI puts that folder on the branch
 * `screenshots`, to look at without running the app.
 */
const OUT = 'shots/out';
const WIDTH_PX = 1200;

/** Looks at a place of the map, `span` meters across, and takes a picture of the page. */
async function take(
  page: Page,
  view: { center: { x: number; y: number }; span: number },
  name: string,
) {
  const state = { x: view.center.x, y: view.center.y, scale: WIDTH_PX / view.span, rotation: 0 };
  await page.evaluate((s) => window.__modelcity!.show(s), state);
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${OUT}/${name}` });
}

test('pictures of the testing ground', async ({ page }) => {
  mkdirSync(OUT, { recursive: true });
  await page.goto('/');
  await page.waitForFunction(() => window.__modelcity?.session.ready);
  await page.evaluate((graph) => {
    window.__modelcity!.editor.graph = graph;
  }, junctionGround());
  await page.keyboard.press('Control+.');
  await page.mouse.move(WIDTH_PX - 5, 5);
  const index: string[] = [];
  for (const c of GROUND_CASES) {
    index.push(`## ^${c.hat}: ${c.name}\n`);
    for (const [i, v] of c.views.entries()) {
      const name = `hat${c.hat}${i ? `-${i + 1}` : ''}.png`;
      await take(page, v, name);
      index.push(`![^${c.hat}, ${v.span} m across](${name})\n`);
    }
  }
  await page.keyboard.press('Control+.');
  await page.keyboard.press('Tab');
  index.push('# Markings only, view mode\n');
  for (const c of GROUND_CASES) {
    await take(page, c.views[0]!, `hat${c.hat}-markings.png`);
    index.push(`## ^${c.hat}: ${c.name}\n\n![^${c.hat}](hat${c.hat}-markings.png)\n`);
  }
  writeFileSync(`${OUT}/README.md`, HEAD + index.join('\n'));
});

const HEAD = `# The testing ground of the junctions

Made by the CI from \`docs/mocks/hat984.json\` (\`bun run shots\`). The cases are listed in \`docs/junctions.md\`.

`;

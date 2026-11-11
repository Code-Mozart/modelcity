import { test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { GROUND_CASES, junctionGround } from '../src/lib/testing/junctionGround';

/**
 * A picture of every case of the testing ground of the junctions, with the debug layer on (^1018):
 * `bun run shots` writes them and an index to `shots/out`; the CI puts that folder on the branch
 * `screenshots`, to look at without running the app.
 */
const OUT = 'shots/out';
const WIDTH_PX = 1200;

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
      const state = { x: v.center.x, y: v.center.y, scale: WIDTH_PX / v.span, rotation: 0 };
      await page.evaluate((s) => window.__modelcity!.show(s), state);
      await page.waitForTimeout(150);
      await page.screenshot({ path: `${OUT}/${name}` });
      index.push(`![^${c.hat}, ${v.span} m across](${name})\n`);
    }
  }
  const head = `# The testing ground of the junctions, debug layer\n\nMade by the CI from \`docs/mocks/hat984.json\` (\`bun run shots\`). The cases are listed in \`docs/junctions.md\`.\n\n`;
  writeFileSync(`${OUT}/README.md`, head + index.join('\n'));
});

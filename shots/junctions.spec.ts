import { test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { GROUND_CASES, junctionGround } from '../src/lib/testing/junctionGround';
import { PRIORITY_CASES, priorityGround } from '../src/lib/testing/priorityGround';
import { T_CASES, tGround } from '../src/lib/testing/tGround';

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

/** The testing grounds: the junctions (^984) and the small junctions, rechts vor links (^1078). */
const GROUNDS = [
  { title: 'The junctions', graph: junctionGround, cases: GROUND_CASES },
  { title: 'Small junctions, rechts vor links', graph: priorityGround, cases: PRIORITY_CASES },
  { title: 'Small T-junctions, the edge cases', graph: tGround, cases: T_CASES },
];

/** Pictures of one ground: every case with the debug layer on, then the markings only in view mode. */
async function shootGround(page: Page, ground: (typeof GROUNDS)[number], index: string[]) {
  await page.evaluate((graph) => {
    window.__modelcity!.editor.graph = graph;
  }, ground.graph());
  await page.keyboard.press('Control+.');
  await page.mouse.move(WIDTH_PX - 5, 5);
  index.push(`# ${ground.title}\n`);
  for (const c of ground.cases) {
    index.push(`## ^${c.hat}: ${c.name}\n`);
    for (const [i, v] of c.views.entries()) {
      const name = `hat${c.hat}${i ? `-${i + 1}` : ''}.png`;
      await take(page, v, name);
      index.push(`![^${c.hat}, ${v.span} m across](${name})\n`);
    }
  }
  await page.keyboard.press('Control+.');
  await page.keyboard.press('Tab');
  index.push(`## ${ground.title}: markings only, view mode\n`);
  for (const c of ground.cases) {
    await take(page, c.views[0]!, `hat${c.hat}-markings.png`);
    index.push(`### ^${c.hat}: ${c.name}\n\n![^${c.hat}](hat${c.hat}-markings.png)\n`);
  }
  await page.keyboard.press('Tab');
}

test('pictures of the testing grounds', async ({ page }) => {
  test.setTimeout(300_000);
  mkdirSync(OUT, { recursive: true });
  await page.goto('/');
  await page.waitForFunction(() => window.__modelcity?.session.ready);
  const index: string[] = [];
  for (const ground of GROUNDS) await shootGround(page, ground, index);
  writeFileSync(`${OUT}/README.md`, HEAD + index.join('\n'));
});

const HEAD = `# The testing grounds of the junctions

Made by the CI from \`docs/mocks/hat984.json\` and \`docs/mocks/hat1078.json\` (\`bun run shots\`). The cases are listed in \`docs/junctions.md\`.

`;

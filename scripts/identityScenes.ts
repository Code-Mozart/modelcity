/**
 * The interaction scenes of the identity check (^1210): on a few views of each ground, what the
 * canvas shows after the pointer hovers a node, after it is clicked, collapsed (`C`) and undone,
 * dragged (halfway, far, dropped) and undone, with the camera turned and zoomed far out, and in
 * view mode. What an optimization must not change is also how the editor answers to the pointer.
 */
import type { Page } from 'playwright';
import type { Graph } from '../src/lib/model/graph';

export interface SceneSet {
  name: string;
  graph: Graph;
  /** Where to look, in the centre of each scene. */
  centers: { x: number; y: number; span: number }[];
}

const WIDTH = 1200;

/** What the canvas shows once the editor and the camera have settled. */
const grab = (page: Page) =>
  page.evaluate(async () => {
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => requestAnimationFrame(r));
    return document.querySelector('canvas')!.toDataURL();
  });

const look = (page: Page, s: { x: number; y: number; scale: number; rotation: number }) =>
  page.evaluate((v) => window.__modelcity!.show(v), s);

type Shots = Map<string, string>;

/** Hover, click, collapse and undo on the node. */
async function selecting(page: Page, at: { x: number; y: number }, name: string, out: Shots) {
  await page.mouse.move(at.x, at.y);
  out.set(`${name}-hover`, await grab(page));
  await page.mouse.click(at.x, at.y);
  out.set(`${name}-select`, await grab(page));
  await page.keyboard.press('c');
  out.set(`${name}-collapse`, await grab(page));
  await page.keyboard.press('Control+z');
  out.set(`${name}-undo-collapse`, await grab(page));
}

/** Drag the node halfway and far, drop it, undo. */
async function dragging(page: Page, at: { x: number; y: number }, name: string, out: Shots) {
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  await page.mouse.move(at.x + 18, at.y + 10, { steps: 4 });
  out.set(`${name}-drag-mid`, await grab(page));
  await page.mouse.move(at.x + 45, at.y + 26, { steps: 6 });
  out.set(`${name}-drag-far`, await grab(page));
  await page.mouse.up();
  out.set(`${name}-dropped`, await grab(page));
  await page.keyboard.press('Control+z');
  out.set(`${name}-undo-drag`, await grab(page));
  await page.keyboard.press('Escape');
}

/** The camera turned, zoomed far out, and the view mode. */
async function elsewhere(page: Page, c: SceneSet['centers'][number], name: string, out: Shots) {
  const scale = WIDTH / c.span;
  await look(page, { x: c.x, y: c.y, scale, rotation: 0.7 });
  out.set(`${name}-rotated`, await grab(page));
  await look(page, { x: c.x, y: c.y, scale: scale * 0.12, rotation: -2.2 });
  out.set(`${name}-far`, await grab(page));
  await look(page, { x: c.x, y: c.y, scale, rotation: 0 });
  await page.keyboard.press('Tab');
  out.set(`${name}-viewing`, await grab(page));
  await page.keyboard.press('Tab');
}

/** The scenes of one ground, each from a clean editor (no selection, no history). */
export async function scenes(page: Page, set: SceneSet): Promise<Shots> {
  const out: Shots = new Map();
  for (const [i, c] of set.centers.entries()) {
    const name = `scene-${set.name}-${i}`;
    await page.evaluate((g) => window.__modelcity!.editor.load(g), set.graph);
    await look(page, { x: c.x, y: c.y, scale: WIDTH / c.span, rotation: 0 });
    const node = set.graph.nodes.reduce((a, b) =>
      Math.hypot(b.x - c.x, b.y - c.y) < Math.hypot(a.x - c.x, a.y - c.y) ? b : a,
    );
    const at = await page.evaluate((n) => window.__modelcity!.toPage(n), node);
    await selecting(page, at, name, out);
    await dragging(page, at, name, out);
    await elsewhere(page, c, name, out);
  }
  return out;
}

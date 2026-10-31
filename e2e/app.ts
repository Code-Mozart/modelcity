import type { Page } from '@playwright/test';
import { nearestOnRoads } from '../src/lib/curves/roads';
import type { Roads } from '../src/lib/curves/roads';

export type Pt = { x: number; y: number };

/** Drives the real app by mouse and keyboard (^145). Coordinates are meters; the app scrolls the view, so every click asks where its point is now. */
export class App {
  constructor(readonly page: Page) {}

  private async at(pt: Pt): Promise<Pt> {
    return this.page.evaluate((p) => window.__modelcity!.toPage(p), pt);
  }

  async click(pt: Pt) {
    const p = await this.at(pt);
    await this.page.mouse.click(p.x, p.y);
  }

  async drag(from: Pt, to: Pt) {
    const a = await this.at(from);
    await this.page.mouse.move(a.x, a.y);
    await this.page.mouse.down();
    const b = await this.at(to);
    await this.page.mouse.move(b.x, b.y, { steps: 6 });
    await this.page.mouse.up();
  }

  roads(): Promise<Roads> {
    return this.page.evaluate(() => JSON.parse(JSON.stringify(window.__modelcity!.editor.roads)));
  }

  state() {
    return this.page.evaluate(() => {
      const e = window.__modelcity!.editor;
      return {
        mode: e.mode,
        selected: e.selection.length,
        kinds: e.edges.map((r) => r.map((x) => x.E.kind)),
      };
    });
  }

  /** The point of the curves nearest to a guess, to click exactly on a curve. */
  async curvePoint(guess: Pt): Promise<Pt> {
    const hit = nearestOnRoads(await this.roads(), guess, 100)!;
    return { x: hit.at.x, y: hit.at.y };
  }

  async radiusHandle(road: number, i: number): Promise<Pt> {
    return this.page.evaluate(
      ([r, n]) => {
        const hook = window.__modelcity!;
        const hs = hook.editor.handles(hook.scale());
        const h = hs.find((x) => x.type === 'rad' && x.road === r && x.i === n && x.t === 0.5)!;
        return { x: h.x, y: h.y };
      },
      [road, i],
    );
  }

  hints() {
    return this.page.getByRole('list', { name: 'Controls' });
  }

  /** Node `i` of road `road`. */
  async node(road: number, i: number) {
    return (await this.roads())[road]!.nodes[i]!;
  }
}

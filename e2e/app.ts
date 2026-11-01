import type { Page } from '@playwright/test';
import { chainsOf, nearestOnChains } from '../src/lib/model/chains';
import type { Graph } from '../src/lib/model/graph';

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

  async hover(pt: Pt) {
    const p = await this.at(pt);
    await this.page.mouse.move(p.x, p.y);
  }

  async rightClick(pt: Pt) {
    const p = await this.at(pt);
    await this.page.mouse.click(p.x, p.y, { button: 'right' });
  }

  /** The box of a drag on empty canvas, from corner to corner. */
  async box(from: Pt, to: Pt) {
    await this.drag(from, to);
  }

  /** The graph of nodes and edges (^106) as plain data. */
  graph(): Promise<Graph> {
    return this.page.evaluate(() => JSON.parse(JSON.stringify(window.__modelcity!.editor.graph)));
  }

  async nodes() {
    return (await this.graph()).nodes;
  }

  async edges() {
    return (await this.graph()).edges;
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
    const hit = nearestOnChains(chainsOf(await this.graph()), guess, 100)!;
    return { x: hit.at.x, y: hit.at.y };
  }

  /** The middle radius point of the edge with this id. */
  async radiusHandle(edge: number): Promise<Pt> {
    return this.page.evaluate((id) => {
      const hook = window.__modelcity!;
      const hs = hook.editor.handles(hook.scale());
      const h = hs.find((x) => x.type === 'rad' && x.id === id && x.t === 0.5)!;
      return { x: h.x, y: h.y };
    }, edge);
  }

  /** The projects stored in the browser (IndexedDB), as export files. */
  stored(): Promise<{ title: string; nodes: unknown[]; edges: unknown[] }[]> {
    return this.page.evaluate(
      () =>
        new Promise<{ title: string; nodes: unknown[]; edges: unknown[] }[]>((resolve, reject) => {
          const open = indexedDB.open('modelcity', 1);
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const all = open.result.transaction('projects').objectStore('projects').getAll();
            all.onsuccess = () => resolve(all.result.map((r: { file: never }) => r.file));
          };
        }),
    );
  }

  /** Draw a road of two nodes, as a user would. */
  async drawRoad() {
    await this.click({ x: 0, y: 30 }); // empty canvas: enters draw mode
    await this.click({ x: 0, y: 0 });
    await this.click({ x: 40, y: 10 });
    await this.page.keyboard.press('Escape');
  }

  hints() {
    return this.page.getByRole('list', { name: 'Controls' });
  }

  /** The node with this id. */
  async node(id: number) {
    return (await this.nodes()).find((n) => n.id === id)!;
  }
}

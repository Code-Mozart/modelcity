import { moveScenarios, moving } from '../testing/moveFixture';
import { at } from '../testing/editHarness';
import { describe, expect, it } from 'vitest';
import { drawing } from '../testing/drawFixture';
import { DRAW_CONTROLS, drawHints, type DrawFacts } from './drawControls';

type Drawing = Awaited<ReturnType<typeof drawing>>;
const run = (f: (d: Drawing) => Promise<boolean>) => async () => f(await drawing());
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Each control of the table, done in the editor in a state where its hint shows: what the hint says it does (^783). */
const DOES: Record<number, () => Promise<boolean>> = {
  ...moveScenarios('draw'),
  711: async () => {
    // A click on the radius point of the bend splits there: a node is inserted and drawn from.
    const m = await moving('draw');
    const rad = m.bend().find((h) => h.type === 'rad' && h.t === 0.5)!;
    m.draw.down(at(rad.x, rad.y), false);
    m.draw.up();
    for (let i = 0; i < 20 && (m.editor.busy || i < 3); i++) await m.settle();
    const edges = (await m.rows()).edges.map((e) => e.slice(0, 3));
    return m.editor.draw.active === 4 && JSON.stringify(edges) === '[[10,1,4],[11,3,1],[12,4,2]]';
  },
  771: run(async (d) => (await d.key('Tab'), d.editor.mode === 'view')),
  410: run(async (d) => {
    await d.click(50, 50);
    const first = d.editor.draw.active === 5 && d.editor.phase === 'extend';
    await d.click(150, 50);
    return first && same((await d.ids()).edges.at(-1), [12, 5, 6]);
  }),
  411: run(async (d) => {
    await d.drag(50, 50, { x: 50, y: 90 });
    const r = await d.rows();
    return Math.abs(r.nodes.find((n) => n[0] === 5)![3] - Math.PI / 2) < 1e-9;
  }),
  707: run(async (d) => {
    await d.click(70, 0);
    const { edges } = await d.ids();
    return (
      d.editor.draw.active === 5 &&
      same(edges, [
        [10, 1, 2],
        [11, 2, 5],
        [12, 5, 3],
      ])
    );
  }),
  715: run(async (d) => {
    await d.click(50, 50);
    await d.click(-30, 0);
    const { edges } = await d.ids();
    return d.editor.draw.active === null && same(edges.at(-1), [13, 5, 6]);
  }),
  708: run(async (d) => {
    await d.drag(70, 0, { x: 70, y: 40 });
    const r = await d.rows();
    const n = r.nodes.find((x) => x[0] === 5);
    return d.editor.draw.active === null && !!n && Math.abs(n[3] - Math.PI / 2) < 1e-9;
  }),
  412: run(async (d) => {
    await d.click(100, 0);
    await d.click(200, 0);
    await d.click(200, 0);
    return d.editor.draw.active === null && (await d.ids()).nodes.includes(5);
  }),
  436: run(async (d) => {
    await d.click(50, 50);
    await d.click(50, 50);
    return d.editor.draw.active === null && !(await d.ids()).nodes.includes(5);
  }),
  496: run(
    async (d) => (await d.click(100, 0), same(d.editor.draw, { active: 3, end: 'end', origin: 1 })),
  ),
  916: run(
    async (d) => (
      await d.click(-100, 0),
      same(d.editor.draw, { active: 1, end: 'start', origin: 3 })
    ),
  ),
  915: run(async (d) => (await d.click(100, 0, true), d.editor.draw.end === 'start')),
  917: run(async (d) => (await d.click(-100, 0, true), d.editor.draw.end === 'end')),
  706: run(
    async (d) => (await d.click(0, 0), same(d.editor.draw, { active: 2, end: 'end', origin: 2 })),
  ),
  714: run(async (d) => {
    await d.click(100, 0);
    await d.click(0, 100);
    return d.editor.draw.active === null && same((await d.ids()).edges.at(-1), [12, 3, 4]);
  }),
  716: run(async (d) => {
    await d.click(50, 50);
    await d.click(50, 90);
    await d.click(50, 50);
    const name = d.editor.history.past.at(-1)?.name;
    return name === 'close road' && same((await d.ids()).edges.at(-1), [13, 6, 5]);
  }),
  489: run(async (d) => (await d.right(0, 100), !(await d.ids()).nodes.includes(4))),
  709: run(async (d) => (await d.right(70, 0), same((await d.ids()).edges, [[10, 1, 2]]))),
  710: run(async (d) => (await d.right(70, 0, true), (await d.ids()).edges.length === 0)),
  1264: run(async (d) => {
    await d.click(50, 50);
    await d.click(150, 50);
    await d.key('Delete');
    const { nodes } = await d.ids();
    return d.editor.draw.active === 5 && nodes.includes(5) && !nodes.includes(6);
  }),
  720: run(async (d) => {
    await d.click(100, 0);
    await d.right(150, 50);
    return d.editor.draw.active === null && d.editor.mode === 'draw';
  }),
  713: run(async (d) => {
    await d.click(100, 0);
    d.editor.hover = d.draw.pickAt({ x: 250, y: 200 });
    await d.key('Escape');
    return d.editor.draw.active === null && d.editor.mode === 'select';
  }),
};

const facts = (over: Partial<DrawFacts> = {}): DrawFacts => ({
  drawing: true,
  extending: false,
  firstNodeOnly: false,
  backwards: false,
  hovered: null,
  act: null,
  way: null,
  ...over,
});
const texts = (f: DrawFacts) => drawHints(f, () => false).map((h) => h.text);

describe('the controls of draw and extend mode (^1263)', () => {
  it.each(DRAW_CONTROLS.map((c) => [c.hat]))('control ^%i does what its hint says', async (hat) => {
    expect(await DOES[hat]!()).toBe(true);
  });

  it('every control of the table has such a scenario, and no other has one', () => {
    expect(Object.keys(DOES).map(Number).sort()).toEqual(DRAW_CONTROLS.map((c) => c.hat).sort());
  });
});

describe('what the hints of draw and extend mode say (^181)', () => {
  it('on the void: place the first node, or the next one while a road is drawn', () => {
    expect(texts(facts())).toEqual([
      'view mode',
      'place first node',
      'place first node and set heading',
      'finish',
    ]);
    expect(texts(facts({ extending: true, firstNodeOnly: true }))).toEqual([
      'view mode',
      'place node',
      'place node and set heading',
      'delete node',
      'cancel',
    ]);
  });

  it('on a curve: split, or merge (split when drawn backwards) while a road is drawn', () => {
    expect(texts(facts({ hovered: 'segment' }))).toContain('split');
    expect(texts(facts({ hovered: 'segment', extending: true }))).toContain('merge');
    expect(texts(facts({ hovered: 'segment', extending: true, backwards: true }))).toContain(
      'split',
    );
  });

  it('on a node: what a click does there', () => {
    const on = (act: DrawFacts['act'], way: DrawFacts['way'] = null) =>
      texts(facts({ hovered: 'node', act, way, extending: act !== 'extend' && act !== 'split' }));
    expect(on('extend', 'forwards')).toEqual(
      expect.arrayContaining(['extend forwards', 'extend backwards']),
    );
    expect(on('finish')).toContain('finish');
    expect(on('close')).toContain('close');
    expect(on('merge')).toContain('merge');
    expect(on('split')).toContain('split');
  });
});

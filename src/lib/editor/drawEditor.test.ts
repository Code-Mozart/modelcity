import { describe, expect, it } from 'vitest';
import { drawing } from '../testing/drawFixture';

const ORIGINAL = {
  nodes: [1, 2, 3, 4],
  edges: [
    [10, 1, 2],
    [11, 2, 3],
  ],
};

describe('drawing through the edit pipeline (^1263)', () => {
  it('a split on a curve finished at once gives the curve back (^237); one that goes on keeps the node', async () => {
    const d = await drawing();
    await d.click(50, 0);
    await d.key('Escape');
    expect(await d.ids()).toEqual(ORIGINAL);
    const kept = await drawing();
    await kept.click(50, 0);
    await kept.click(50, 60);
    await kept.key('Escape');
    expect((await kept.ids()).edges).toEqual([
      [10, 1, 2],
      [11, 2, 5],
      [12, 5, 3],
      [13, 5, 6],
    ]);
  });
});

describe('undo and redo while drawing (^1263, ^81, ^103)', () => {
  it('undo goes back node by node and to drawing the road; redo forward; Alt undoes the road at once', async () => {
    const d = await drawing();
    await d.click(50, 50);
    await d.click(100, 50);
    await d.click(150, 50);
    await d.key('Escape');
    expect(d.editor.history.past.map((s) => s.name)).toEqual([
      'place node',
      'place node',
      'place node',
      'finish road',
    ]);
    await d.editor.undo();
    expect(d.editor.draw.active).toBe(7);
    expect(d.editor.mode).toBe('draw');
    await d.editor.undo();
    expect(d.editor.draw.active).toBe(6);
    expect((await d.ids()).nodes).toEqual([1, 2, 3, 4, 5, 6]);
    await d.editor.redo();
    expect(d.editor.draw.active).toBe(7);
    await d.editor.undo(true);
    expect(await d.ids()).toEqual(ORIGINAL);
    expect(d.editor.draw.active).toBe(null);
    await d.editor.redo(true);
    expect((await d.ids()).nodes).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(d.editor.draw.active).toBe(null);
  });
});

describe('ids, cancelling and deleting while drawing (^1263, ^1224, ^437, ^70)', () => {
  it('a node placed after an undo gets a new id: ids are never given twice (^1224)', async () => {
    const d = await drawing();
    await d.click(50, 50);
    await d.click(100, 50);
    await d.editor.undo();
    await d.click(100, 80);
    expect((await d.ids()).nodes).toEqual([1, 2, 3, 4, 5, 7]);
    expect((await d.ids()).edges.at(-1)).toEqual([13, 5, 7]);
  });

  it('the first node alone, finished, is cancelled (^437); undo brings it back to draw from', async () => {
    const d = await drawing();
    await d.click(50, 50);
    await d.right(150, 150);
    expect(await d.ids()).toEqual(ORIGINAL);
    expect(d.editor.history.past.at(-1)?.name).toBe('cancel first node');
    await d.editor.undo();
    expect(d.editor.draw.active).toBe(5);
    expect((await d.ids()).nodes).toContain(5);
  });

  it('Del while drawing deletes the node drawn from; the road goes on from the one before, which stays even with no segment (^70)', async () => {
    const d = await drawing();
    await d.click(50, 50);
    await d.click(100, 50);
    await d.key('Delete');
    expect(d.editor.draw.active).toBe(5);
    await d.key('Delete');
    expect(d.editor.draw.active).toBe(null);
    expect(await d.ids()).toEqual(ORIGINAL);
    await d.editor.undo();
    expect(d.editor.draw.active).toBe(5);
  });
});

describe('extending, splitting and merging, and what is shown (^1263)', () => {
  it('extending backwards from a branch start node draws the new segments into it', async () => {
    const d = await drawing();
    await d.click(-100, 0);
    await d.click(-150, 0);
    expect((await d.ids()).edges.at(-1)).toEqual([12, 5, 1]);
  });

  it('a click on a node with two segments splits a road off it; reaching another road merges', async () => {
    const d = await drawing();
    await d.click(0, 0);
    await d.click(0, 50);
    await d.click(0, 100);
    expect((await d.ids()).edges.slice(2)).toEqual([
      [12, 2, 5],
      [13, 5, 4],
    ]);
    expect(d.editor.draw.active).toBe(null);
    expect(d.editor.history.past.at(-1)?.name).toBe('merge road');
  });

  it('the chunks in memory show every written node and segment at once', async () => {
    const d = await drawing();
    await d.click(50, 50);
    await d.click(100, 50);
    expect(d.memory.index.nodeOf(6)).toBeDefined();
    expect(d.memory.index.edgesAt(6).map((e) => e[0])).toEqual([12]);
  });

  it('what a press would do is shown before it is written, and nothing is left shown after', async () => {
    const d = await drawing();
    await d.click(50, 50);
    d.draw.down({ x: 300, y: 250 }, false);
    expect(d.editor.draft?.edges.map((p) => p.after?.[0])).toEqual([12]);
    d.draw.up();
    await d.settle();
    expect(d.editor.draft).toBe(null);
  });
});

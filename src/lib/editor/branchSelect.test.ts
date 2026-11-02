import { describe, expect, it } from 'vitest';
import { hintsFor } from '../hints/hints';
import { at, bareCurvePoint, click, draw } from '../testing/editorHelpers';

/** A road (0,0) - (40,-20) - (80,0) and a branch from its middle node to (80,-60), select mode. */
const tee = () => {
  const ed = draw([
    [0, 0],
    [40, -20],
    [80, 0],
  ]);
  ed.key('Escape');
  click(ed, 500, 500);
  click(ed, 40, -20);
  click(ed, 80, -60);
  ed.key('Escape');
  return ed;
};

const alt = (ed: ReturnType<typeof tee>, x: number, y: number) => {
  ed.pointerDown(at(x, y, { alt: true }));
  ed.pointerUp();
};

describe('Alt+click selects a branch (^128)', () => {
  it('only the branch that is clicked, first and last node included', () => {
    const ed = tee();
    const wing = ed.edges[1]![0]!.E.pieces.at(-1)!;
    const on = wing.type === 'arc' ? { x: wing.Q.x - 4, y: wing.Q.y } : wing.P;
    alt(ed, on.x, on.y);
    // the two nodes of the branch, one of them where the other road meets it
    expect(ed.selection).toHaveLength(2);
  });

  it('a second Alt+click on the same branch deselects it, and the hint says so', () => {
    const ed = tee();
    const p = bareCurvePoint(ed);
    alt(ed, p.x, p.y);
    const before = ed.selection.length;
    expect(before).toBeGreaterThan(0);
    ed.pointerMove(at(p.x, p.y));
    const rows = hintsFor(false, ed.hintTarget, ed.selection.length).map((h) => h.text);
    expect(rows).toContain('deselect branch');
    alt(ed, p.x, p.y);
    expect(ed.selection).toEqual([]);
  });

  it('a branch is not selected when another one is, the hint then offers to select', () => {
    const ed = tee();
    const p = bareCurvePoint(ed);
    ed.pointerMove(at(p.x, p.y));
    const rows = hintsFor(false, ed.hintTarget, 0).map((h) => h.text);
    expect(rows).toContain('select branch');
  });
});

const altShift = (ed: ReturnType<typeof tee>, x: number, y: number) => {
  ed.pointerDown(at(x, y, { alt: true, shift: true }));
  ed.pointerUp();
};
const nodesOf = (ed: ReturnType<typeof tee>) => [...ed.selection].sort((a, b) => a - b);

describe('Alt+Shift+click adds a branch or deselects it (^244)', () => {
  it('adds the branch to what is selected; Alt alone would replace the selection', () => {
    const first = tee();
    const [a, b] = [bareCurvePoint(first, 0), bareCurvePoint(first, 2)];
    alt(first, a.x, a.y);
    const one = nodesOf(first);
    altShift(first, b.x, b.y);
    expect(nodesOf(first).length).toBeGreaterThan(one.length);
    expect(one.every((id) => first.selection.includes(id))).toBe(true);

    const second = tee();
    alt(second, a.x, a.y);
    alt(second, b.x, b.y);
    expect(one.every((id) => second.selection.includes(id))).toBe(false);
  });

  it('deselects the branch if all its nodes are selected, the other nodes stay', () => {
    const ed = tee();
    const [a, b] = [bareCurvePoint(ed, 0), bareCurvePoint(ed, 2)];
    alt(ed, a.x, a.y);
    altShift(ed, b.x, b.y);
    const both = nodesOf(ed);
    altShift(ed, b.x, b.y);
    const rest = nodesOf(ed);
    expect(rest.length).toBeLessThan(both.length);
    expect(rest.length).toBeGreaterThan(0);
    expect(both.some((id) => !rest.includes(id))).toBe(true);
  });
});

describe('the hints of Alt+Shift+click (^244)', () => {
  it('say what it does: add the branch, or deselect it', () => {
    const ed = tee();
    const [a, b] = [bareCurvePoint(ed, 0), bareCurvePoint(ed, 2)];
    alt(ed, a.x, a.y);
    ed.pointerMove(at(b.x, b.y));
    const texts = () => hintsFor(false, ed.hintTarget, ed.selection.length).map((h) => h.text);
    expect(texts()).toContain('add branch to selection');
    altShift(ed, b.x, b.y);
    ed.pointerMove(at(b.x, b.y));
    expect(texts().filter((t) => t === 'deselect branch')).toHaveLength(2); // Alt and Alt+Shift
    expect(texts()).not.toContain('add branch to selection');
  });

  it('with nothing selected there is no Alt+Shift row, as with Shift', () => {
    const ed = tee();
    const p = bareCurvePoint(ed, 0);
    ed.pointerMove(at(p.x, p.y));
    const rows = hintsFor(false, ed.hintTarget, 0);
    expect(rows.some((r) => r.text === 'add branch to selection')).toBe(false);
  });
});

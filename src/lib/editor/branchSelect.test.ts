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
    expect(rows).toContain('deselect lane');
    alt(ed, p.x, p.y);
    expect(ed.selection).toEqual([]);
  });

  it('a branch is not selected when another one is, the hint then offers to select', () => {
    const ed = tee();
    const p = bareCurvePoint(ed);
    ed.pointerMove(at(p.x, p.y));
    const rows = hintsFor(false, ed.hintTarget, 0).map((h) => h.text);
    expect(rows).toContain('select lane');
  });
});

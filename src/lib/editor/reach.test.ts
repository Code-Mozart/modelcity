import { describe, expect, it } from 'vitest';
import { at, bareCurvePoint, click, draw } from '../testing/editorHelpers';

const road = () => {
  const ed = draw([
    [0, 0],
    [40, -20],
    [80, 0],
  ]);
  ed.key('Escape');
  click(ed, 500, 500);
  return ed;
};

describe('how near a curve is (^137)', () => {
  it('is as near as a node is: 9 px, so 2.25 m at 4 px per meter', () => {
    const ed = road();
    const p = bareCurvePoint(ed);
    ed.pointerMove(at(p.x, p.y + 1.5));
    expect(ed.hover?.kind).toBe('candidate');
    ed.pointerMove(at(p.x, p.y + 6));
    expect(ed.hover?.kind).not.toBe('candidate');
  });

  it('no node can be split off or inserted closer than the smallest radius to a node', () => {
    const ed = road();
    // 0.3 m along the curve from the first node, beyond the node's reach only at a high zoom
    const info = { ...at(0.3, 0), scale: 400 };
    ed.pointerMove(info);
    expect(ed.hover?.kind).not.toBe('candidate');
    ed.pointerMove({ ...at(5, -2.4), scale: 400 });
    expect(ed.hover?.kind).not.toBe('handle');
  });
});

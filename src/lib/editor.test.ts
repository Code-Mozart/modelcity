import { describe, expect, it } from 'vitest';
import { Editor, type PointerInfo } from './editor.svelte';
import { pointOn } from './curves/piece';

const at = (x: number, y: number, extra: Partial<PointerInfo> = {}): PointerInfo => ({
  pt: { x, y },
  scale: 4,
  touch: false,
  shift: false,
  ...extra,
});

describe('Editor pointer interaction', () => {
  it('drags a node and selects it', () => {
    const ed = new Editor();
    const n = ed.path.nodes[1]!;
    expect(ed.pointerDown(at(n.x, n.y))).toBe(true);
    expect(ed.sel).toBe(1);
    ed.pointerMove(at(n.x + 3, n.y - 2));
    ed.pointerUp();
    expect(ed.path.nodes[1]).toMatchObject({ x: n.x + 3, y: n.y - 2 });
    ed.pointerMove(at(n.x + 50, n.y + 50));
    expect(ed.path.nodes[1]).toMatchObject({ x: n.x + 3, y: n.y - 2 });
  });

  it('lets the canvas pan when empty space is pressed in Move', () => {
    const ed = new Editor();
    ed.sel = 2;
    expect(ed.pointerDown(at(500, 500))).toBe(false);
    expect(ed.sel).toBe(-1);
  });

  it('removes a node by right-click and by Delete', () => {
    const ed = new Editor();
    const n = ed.path.nodes[0]!;
    ed.removeAt(at(n.x, n.y));
    expect(ed.path.nodes).toHaveLength(3);
    ed.sel = 0;
    expect(ed.key('Delete')).toBe(true);
    expect(ed.path.nodes).toHaveLength(2);
    expect(ed.sel).toBe(-1);
  });

  it('resets an explicit radius to auto on double-click of its ring', () => {
    const ed = new Editor();
    const before = ed.handles(4).find((h) => h.type === 'rad' && h.i === 0)!;
    ed.path = { ...ed.path, radii: [5, null, null] };
    const moved = ed.handles(4).find((h) => h.type === 'rad' && h.i === 0)!;
    expect(moved.x).not.toBe(before.x);
    ed.resetRadiusAt(at(moved.x, moved.y));
    expect(ed.path.radii[0]).toBeNull();
  });
});

describe('Editor tools', () => {
  it('inserts a node on the curve', () => {
    const ed = new Editor();
    const mid = pointOn(ed.edges[0]!.E.pieces[1]!, 0.5);
    ed.setTool('insert');
    ed.pointerMove(at(mid.x, mid.y));
    expect(ed.hover?.kind).toBe('candidate');
    expect(ed.pointerDown(at(mid.x, mid.y))).toBe(true);
    expect(ed.path.nodes).toHaveLength(5);
    expect(ed.sel).toBe(1);
  });

  it('ignores an insert click away from the curve but keeps the tool', () => {
    const ed = new Editor();
    ed.setTool('insert');
    expect(ed.pointerDown(at(0, 90))).toBe(true);
    expect(ed.path.nodes).toHaveLength(4);
  });

  it('appends at the nearer end and previews the new node', () => {
    const ed = new Editor();
    ed.setTool('append');
    ed.pointerMove(at(120, 30));
    expect(ed.hover).toMatchObject({ kind: 'ghost', end: 'end' });
    ed.pointerDown(at(120, 30));
    expect(ed.path.nodes).toHaveLength(5);
    expect(ed.sel).toBe(4);
  });
});

describe('Editor keys and presets', () => {
  it('switches tools with the keymap and ignores unbound keys', () => {
    const ed = new Editor();
    ed.key('a');
    expect(ed.tool).toBe('append');
    ed.key('i');
    expect(ed.tool).toBe('insert');
    ed.key('Escape');
    expect(ed.tool).toBe('move');
    expect(ed.key('q')).toBe(false);
  });

  it('loads presets and describes the path in the readout', () => {
    const ed = new Editor();
    ed.loadPreset('G');
    expect(ed.path.nodes).toHaveLength(2);
    expect(ed.readout).toContain('S-curve');
  });
});

import { describe, expect, it } from 'vitest';
import { applyDrag, radiusFromCursor, startDrag } from './drag';
import { buildEdge, type Edge } from './edge';
import {
  appendNode,
  autoHeading,
  edgesOf,
  insertNode,
  nearestOnCurve,
  removeNode,
  type Path,
} from './path';
import { isDegenerate, pieceLength, pointOn } from './piece';
import { fixture, type FixtureName } from './testing/paths';
import { dist, fromAngle, toRad } from './vec';

const NAMES: FixtureName[] = ['H', 'G', 'hook'];
const noMods = { snap: false };

const totalLength = (path: Path) =>
  edgesOf(path).reduce((sum, { E }) => sum + E.pieces.reduce((s, p) => s + pieceLength(p), 0), 0);

/** Pieces form one connected chain whose arcs end where they say they do. */
function expectConnected(E: Edge, p: Path['nodes'][number], q: Path['nodes'][number]) {
  const { pieces } = E;
  expect(dist(pieces[0]!.P, p)).toBeLessThan(1e-6);
  expect(dist(pieces[pieces.length - 1]!.Q, q)).toBeLessThan(1e-6);
  pieces.forEach((piece, k) => {
    if (k > 0) expect(dist(pieces[k - 1]!.Q, piece.P)).toBeLessThan(1e-6);
    // Arcs sweeping less than 1e-3 rad are dropped, which can leave a gap of r * 1e-3.
    if (piece.type === 'arc')
      expect(dist(pointOn(piece, 1), piece.Q)).toBeLessThan(piece.r * 1.1e-3 + 1e-6);
  });
}

describe('edge geometry', () => {
  it.each(NAMES)('preset %s is connected and leaves nodes along their headings', (name) => {
    const path = fixture(name);
    for (const { p, q, E } of edgesOf(path)) {
      expectConnected(E, p, q);
      const head = pointOn(
        E.pieces.find((x) => !isDegenerate(x))!,
        0,
      );
      const T = fromAngle(p.th);
      expect(head.tx * T.x + head.ty * T.y).toBeGreaterThan(1 - 1e-6);
    }
  });

  it('chooses bend, S and hook for the three presets', () => {
    expect(edgesOf(fixture('H')).map((e) => e.E.kind)).toEqual(['C', 'C', 'C']);
    expect(edgesOf(fixture('G'))[0]!.E.kind).toBe('S');
    expect(edgesOf(fixture('hook'))[0]!.E.kind).toBe('H');
  });

  it('keeps pieces connected for arbitrary node pairs', () => {
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let n = 0; n < 300; n++) {
      const p = { x: 0, y: 0, th: rnd() * 6.28 - 3.14 };
      const q = { x: rnd() * 80 - 40, y: rnd() * 80 - 40, th: rnd() * 6.28 - 3.14 };
      expectConnected(buildEdge(p, q, null, null), p, q);
    }
  });
});

describe('radius', () => {
  it('uses the largest fitting radius when auto, and an explicit one never changes headings', () => {
    const [p, q] = fixture('H').nodes;
    const auto = buildEdge(p!, q!, null, null);
    if (auto.kind !== 'C') throw new Error('expected a bend');
    expect(auto.auto).toBe(true);
    expect(auto.R).toBeCloseTo(auto.Rmax);
    const small = buildEdge(p!, q!, auto.Rmax / 2, null);
    if (small.kind !== 'C') throw new Error('expected a bend');
    expect(small.R).toBeCloseTo(auto.Rmax / 2);
    expectConnected(small, p!, q!);
    const head = pointOn(small.pieces[0]!, 0);
    expect(head.tx).toBeCloseTo(Math.cos(p!.th));
  });

  it('gives an S-curve two arcs of one radius', () => {
    const [p, q] = fixture('G').nodes;
    const E = buildEdge(p!, q!, 8, null);
    const arcs = E.pieces.filter((x) => x.type === 'arc');
    expect(arcs).toHaveLength(2);
    expect(arcs[0]!.r).toBeCloseTo(8);
    expect(arcs[1]!.r).toBeCloseTo(8);
  });
});

describe('path edits', () => {
  it('appends at the nearer end with a heading that makes a single bend', () => {
    const { path, sel } = appendNode(fixture('H'), { x: 120, y: 30 });
    expect(sel).toBe(path.nodes.length - 1);
    expect(path.radii).toHaveLength(path.nodes.length - 1);
    expect(edgesOf(path).at(-1)!.E.kind).toBe('C');
  });

  it('starts a path with a single node', () => {
    const { path } = appendNode({ nodes: [], radii: [], shapes: [] }, { x: 1, y: 2 });
    expect(path.nodes).toHaveLength(1);
    expect(path.radii).toHaveLength(0);
  });

  it.each(NAMES)('inserting a node on %s does not change the curve (^10)', (name) => {
    const path = fixture(name);
    const before = totalLength(path);
    for (const { E } of edgesOf(path)) {
      E.pieces.forEach((piece, k) => {
        const at = pointOn(piece, 0.5);
        const hit = nearestOnCurve(path, at, 0.5);
        if (!hit || hit.ref.E !== E) return;
        const { path: next } = insertNode(path, { ...hit, k });
        expect(next.nodes).toHaveLength(path.nodes.length + 1);
        expect(totalLength(next)).toBeCloseTo(before, 3);
      });
    }
  });

  it('removes nodes at the ends and in the middle', () => {
    const path = fixture('H');
    for (const i of [0, 1, 3]) {
      const next = removeNode(path, i);
      expect(next.nodes).toHaveLength(3);
      expect(next.radii).toHaveLength(2);
      expect(next.shapes).toHaveLength(2);
    }
    expect(removeNode(removeNode(fixture('G'), 0), 0).nodes).toHaveLength(0);
  });
});

describe('dragging handles', () => {
  it('moves a node', () => {
    const path = fixture('H');
    const next = applyDrag(
      path,
      startDrag(path, { type: 'node', i: 1, x: 0, y: 0 }),
      { x: 5, y: 6 },
      noMods,
    );
    expect(next.nodes[1]).toMatchObject({ x: 5, y: 6 });
    expect(path.nodes[1]!.x).not.toBe(5);
  });

  it('editing a heading clears the shape tags of its edges (^7)', () => {
    const path = {
      ...fixture('H'),
      shapes: [{ kind: 'C' as const }, { kind: 'C' as const }, { kind: 'C' as const }],
    };
    const next = applyDrag(
      path,
      startDrag(path, { type: 'head', i: 1, x: 0, y: 0 }),
      { x: 0, y: -50 },
      noMods,
    );
    expect(next.shapes).toEqual([null, null, { kind: 'C' }]);
  });

  it('snaps headings to 15 degrees with the modifier', () => {
    const path = fixture('H');
    const n = path.nodes[0]!;
    const pt = { x: n.x + 10 * Math.cos(toRad(33)), y: n.y + 10 * Math.sin(toRad(33)) };
    const next = applyDrag(path, startDrag(path, { type: 'head', i: 0, x: 0, y: 0 }), pt, {
      ...noMods,
      snap: true,
    });
    expect(next.nodes[0]!.th).toBeCloseTo(toRad(30));
  });
});

describe('dragging radii', () => {
  it('the bend radius gesture reproduces the current radius at the arc midpoint (^8)', () => {
    const [p, q] = fixture('H').nodes;
    const E = buildEdge(p!, q!, 6, null);
    if (E.kind !== 'C') throw new Error('expected a bend');
    expect(radiusFromCursor(E, pointOn(E.pieces[1]!, 0.5))).toBeCloseTo(6);
  });

  it('setting a radius leaves headings alone and dragging far snaps back to auto', () => {
    const path = fixture('H');
    const handle = { type: 'rad' as const, i: 0, k: -1, x: 0, y: 0 };
    const E = edgesOf(path)[0]!.E;
    if (E.kind !== 'C') throw new Error('expected a bend');
    const small = applyDrag(path, startDrag(path, handle), pointOn(E.pieces[1]!, 0.5), noMods);
    expect(small.radii[0]).toBeNull();
    const tight = applyDrag(path, startDrag(path, handle), { x: E.C.x + 1, y: E.C.y }, noMods);
    expect(tight.radii[0]).toBeGreaterThan(0);
    expect(tight.nodes).toEqual(path.nodes);
  });
});

describe('^16 bend whenever the heading lines meet', () => {
  it('chooses a single bend for an L shape even when the nodes are far apart along one heading', () => {
    const p = { x: 0, y: 0, th: -Math.PI / 2 };
    const q = { x: 18, y: -3, th: 0 };
    expect(buildEdge(p, q, null, null).kind).toBe('C');
    expect(buildEdge(p, { ...q, x: 400 }, null, null).kind).toBe('C');
  });
});

describe('^17 S-curve radius drag follows the cursor', () => {
  const path: Path = { ...fixture('G'), radii: [8] };
  const ringAndCorner = (p: Path) => {
    const E = edgesOf(p)[0]!.E;
    if (E.kind !== 'S' || !E.k1) throw new Error('expected an S with a corner');
    return { ring: pointOn(E.pieces[1]!, 0.5), corner: E.k1, R: E.R };
  };
  const dragTo = (pt: { x: number; y: number }) =>
    applyDrag(path, startDrag(path, { type: 'rad', i: 0, k: 1, x: 0, y: 0 }), pt, noMods);

  it('moving the ring toward the corner decreases the radius, away increases it', () => {
    const { ring, corner } = ringAndCorner(path);
    const u = { x: corner.x - ring.x, y: corner.y - ring.y };
    const l = Math.hypot(u.x, u.y);
    const toward = ringAndCorner(
      dragTo({ x: ring.x + (u.x / l) * 0.4, y: ring.y + (u.y / l) * 0.4 }),
    );
    const away = ringAndCorner(
      dragTo({ x: ring.x - (u.x / l) * 0.4, y: ring.y - (u.y / l) * 0.4 }),
    );
    expect(toward.R).toBeLessThan(8);
    expect(away.R).toBeGreaterThan(8);
  });

  it('puts the ring under the cursor', () => {
    const { ring, corner } = ringAndCorner(path);
    const pt = { x: ring.x + (ring.x - corner.x) * 0.05, y: ring.y + (ring.y - corner.y) * 0.05 };
    const next = ringAndCorner(dragTo(pt));
    expect(dist(next.ring, pt)).toBeLessThan(0.05);
  });
});

describe('^40 a node placed behind the arrow still gets a curve', () => {
  const p = { x: 0, y: 0, th: 0 };
  const angles = [90, 105, 135, 165, 179, 180, -179, -165, -135, -105, -90];

  it.each(angles)('cursor at %f degrees from the heading: a curve, not a straight line', (deg) => {
    const a = toRad(deg);
    const pt = { x: 10 * Math.cos(a), y: 10 * Math.sin(a) };
    const q = { ...pt, th: autoHeading(p, pt) };
    const E = buildEdge(p, q, null, null);
    expect(E.kind).not.toBe('line');
    expectConnected(E, p, q);
    const head = pointOn(
      E.pieces.find((x) => !isDegenerate(x))!,
      0,
    );
    expect(head.tx).toBeCloseTo(1);
  });

  it('turns through one circle: the total sweep is twice the angle to the cursor', () => {
    const a = toRad(135);
    const pt = { x: 10 * Math.cos(a), y: 10 * Math.sin(a) };
    const E = buildEdge(p, { ...pt, th: autoHeading(p, pt) }, null, null);
    const sweep = E.pieces.reduce((s, x) => s + (x.type === 'arc' ? Math.abs(x.da) : 0), 0);
    expect(sweep).toBeCloseTo(toRad(270), 3);
  });

  it('still draws a straight line when the cursor is straight ahead', () => {
    const pt = { x: 10, y: 0 };
    expect(buildEdge(p, { ...pt, th: autoHeading(p, pt) }, null, null).kind).toBe('line');
  });
});

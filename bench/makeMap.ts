/**
 * The text of a project file with one big connected road network (^1249), in pieces (^1256): rows
 * of straight roads (nodes `spacing` meters apart, heading east) joined by S-curves at every 8th
 * column, every row to the next, so that it is one connected graph (a single component,
 * `src/lib/testing/benchMap.test.ts`). The functions are sent to the page and run there (`mapSource`),
 * so each uses nothing but the others; and the text is made a piece at a time, because the text of
 * two million nodes is longer than a string can be.
 */
export function mapShape(nodes: number, spacing: number) {
  const cols = Math.ceil(Math.sqrt(nodes));
  const rows = Math.ceil(nodes / cols);
  const edges = rows * (cols - 1) + (rows - 1) * Math.ceil(cols / 8);
  const head = {
    version: 2,
    title: 'bench',
    createdAt: '2026-11-15T00:00:00Z',
    lastUpdatedAt: '2026-11-15T00:00:00Z',
    camera: {
      x: (cols / 2) * spacing * 1000,
      y: (rows / 2) * spacing * 1000,
      scale: 1,
      rotation: 0,
    },
    laneConfigurations: { '1': { name: 'default', width: 3000 } },
    nextNodeId: rows * cols,
    nextEdgeId: edges,
  };
  return { cols, rows, edges, head };
}

export function* nodePieces(rows: number, cols: number, spacing: number): Generator<string> {
  let part: string[] = [];
  for (let i = 0; i < rows * cols; i++) {
    part.push(`[${i},${(i % cols) * spacing * 1000},${Math.floor(i / cols) * spacing * 1000},0]`);
    if (part.length < 20000 && i < rows * cols - 1) continue;
    yield part.join(',') + (i === rows * cols - 1 ? ']' : ',');
    part = [];
  }
}

export function* edgePieces(rows: number, cols: number, edges: number): Generator<string> {
  let part: string[] = [];
  let id = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols - 1; c++)
      part.push(`[${id++},${r * cols + c},${r * cols + c + 1},null,1]`);
    for (let c = 0; c < cols && r + 1 < rows; c += 8)
      part.push(`[${id++},${r * cols + c},${(r + 1) * cols + c},null,1]`);
    if (part.length < 20000 || id >= edges) continue;
    yield `${part.join(',')},`;
    part = [];
  }
  yield `${part.join(',')}]`;
}

export function* makeMapPieces(nodes: number, spacing: number): Generator<string> {
  const { cols, rows, edges, head } = mapShape(nodes, spacing);
  yield `${JSON.stringify(head).slice(0, -1)},"nodes":[`;
  yield* nodePieces(rows, cols, spacing);
  yield ',"edges":[';
  yield* edgePieces(rows, cols, edges);
  yield '}';
}

/** The source that the page runs to get `makeMapPieces`. */
export const mapSource = () =>
  [mapShape, nodePieces, edgePieces, makeMapPieces].map((f) => f.toString()).join('\n') +
  '\n;makeMapPieces';

/** The same as one text, for the sizes that fit in a string (the tests). */
export const makeMapText = (nodes: number, spacing: number): string =>
  [...makeMapPieces(nodes, spacing)].join('');

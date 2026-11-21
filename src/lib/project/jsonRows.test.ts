import { describe, expect, it } from 'vitest';
import { ROW_BATCH, TopLevelReader, type Found } from './jsonRows';

const read = (text: string, size: number) => {
  const r = new TopLevelReader(new Set(['nodes', 'edges']));
  const out: Found[] = [];
  for (let i = 0; i < text.length; i += size) out.push(...r.push(text.slice(i, i + size)));
  r.end();
  return out;
};

/** Values and rows in one list, rows joined per key. */
const joined = (found: Found[]) => {
  const o: Record<string, unknown> = {};
  for (const f of found)
    if ('rows' in f) o[f.key] = [...((o[f.key] as unknown[]) ?? []), ...f.rows];
    else o[f.key] = f.value;
  return o;
};

const sample = {
  version: 2,
  title: 'a "quoted" [title], {with} \\ stuff',
  camera: { x: 1, y: -2.5, scale: 1e-3, rotation: 0 },
  nodes: [
    [0, 1, 2, 0.5],
    [1, -3, 4, 1e2],
  ],
  flag: true,
  nothing: null,
  edges: [[0, 0, 1, null, 1]],
  laneConfigurations: { '1': { name: 'x]', width: 3000 } },
  empty: [],
};

describe('the reader of a big JSON object, piece by piece (^1256)', () => {
  const text = JSON.stringify(sample, null, 2);

  it.each([1, 2, 3, 7, 64, 100000])('finds the same with pieces of %i characters', (size) => {
    expect(joined(read(text, size))).toEqual(sample);
  });

  it('reads compact text as well', () => {
    expect(joined(read(JSON.stringify(sample), 5))).toEqual(sample);
  });

  it('gives rows in batches, and a batch is never more than ROW_BATCH', () => {
    const nodes = Array.from({ length: ROW_BATCH * 2 + 3 }, (_, i) => [i, 0, 0, 0]);
    const found = read(JSON.stringify({ nodes }), 100000);
    expect(found.map((f) => ('rows' in f ? f.rows.length : 0))).toEqual([ROW_BATCH, ROW_BATCH, 3]);
    expect(read('{"nodes": []}', 100)).toEqual([{ key: 'nodes', rows: [] }]);
  });

  it.each([
    ['not an object', '[1]'],
    ['cut off', '{"a": 1'],
    ['cut in a row', '{"nodes": [[1, 2'],
    ['text after the object', '{"a": 1} x'],
    ['a bad value', '{"a": tru}'],
  ])('refuses text that is not valid: %s', (_, bad) => {
    expect(() => read(bad, 4)).toThrow(SyntaxError);
  });
});

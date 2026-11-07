import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fromFile } from '../project/file';
import { parallel, touching } from './parallel';
import { towersOf } from './towers';

// ^815: two bends whose end nodes form towers (3 m apart, opposite headings), but their radii are not concentric.
const project = () =>
  fromFile(
    JSON.parse(readFileSync(new URL('../../../docs/mocks/hat815.json', import.meta.url), 'utf8')),
  ).graph;

describe('towers at both ends do not make segments parallel (^825)', () => {
  it('the end nodes touch and form two towers', () => {
    const g = project();
    expect(touching(g, g.edges[0]!, g.edges[1]!)).toBe(true);
    expect(towersOf(g).map((t) => t.length)).toEqual([2, 2]);
  });

  it('but the radii are not concentric, so the segments are not parallel (^334 C)', () => {
    const g = project();
    expect(parallel(g, g.edges[0]!, g.edges[1]!)).toBe(false);
  });
});

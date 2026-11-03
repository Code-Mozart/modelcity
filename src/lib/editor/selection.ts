import type { Vec } from '../curves/vec';
import { edgesBetween, type Graph } from '../model/graph';
import { branchOfEdge } from '../model/junction';
import type { Hover, Press } from './types';

/** The selection box in screen pixels, axis-aligned with the viewport (^70). */
export interface Band {
  a: Vec;
  b: Vec;
}

/** The same nodes, whatever the order they were picked in. */
export const sameSelection = (a: number[], b: number[]) =>
  a.length === b.length && a.every((id) => b.includes(id));

export const isSelected = (sel: number[], ref: number) => sel.includes(ref);

/** The selection with the nodes added; nodes already selected keep their place. */
export const withNodes = (sel: number[], refs: number[]) =>
  refs.reduce((all, r) => (isSelected(all, r) ? all : [...all, r]), sel);

export const withoutNode = (sel: number[], ref: number) => sel.filter((s) => s !== ref);

export const pickedCount = (sel: number[], refs: number[]) =>
  refs.filter((r) => isSelected(sel, r)).length;

/**
 * A click on a curve (^74): selects its two nodes; with shift it adds them, or, if both are
 * selected already, deselects them.
 */
export function afterCurveClick(sel: number[], nodes: number[], shift: boolean): number[] {
  if (!shift) return nodes;
  if (pickedCount(sel, nodes) < nodes.length) return withNodes(sel, nodes);
  return nodes.reduce(withoutNode, sel);
}

export const allSelected = (sel: number[], refs: number[]) =>
  refs.length > 0 && refs.every((r) => isSelected(sel, r));

/** Alt+click on a branch (^128): selects its nodes, or deselects them if they are all selected. */
export const afterBranchClick = (sel: number[], nodes: number[]): number[] =>
  allSelected(sel, nodes) ? nodes.reduce(withoutNode, sel) : nodes;

/**
 * Alt+Shift+click on a branch (^244): adds its nodes to the selection, or deselects them if they
 * are all selected (the others stay).
 */
export const afterBranchAdd = (sel: number[], nodes: number[]): number[] =>
  allSelected(sel, nodes) ? nodes.reduce(withoutNode, sel) : withNodes(sel, nodes);

/** The segments (edge ids) whose two nodes are both selected. */
export const selectedSegments = (g: Graph, sel: number[]): number[] =>
  edgesBetween(g, sel).map((e) => e.id);

/** What pressing a node does to the selection, and what a release without moving does (^71, ^72, ^128). */
export interface NodePress {
  selection: number[];
  click: 'toggle' | 'collapse' | 'keep';
}

export interface Modifiers {
  shift: boolean;
  alt: boolean;
}

export function pressNode(
  sel: number[],
  ref: number,
  lane: number[],
  { shift, alt }: Modifiers,
): NodePress {
  if (alt) {
    return { selection: (shift ? afterBranchAdd : afterBranchClick)(sel, lane), click: 'keep' };
  }
  if (shift) {
    const was = isSelected(sel, ref);
    return { selection: withNodes(sel, [ref]), click: was ? 'toggle' : 'keep' };
  }
  return { selection: isSelected(sel, ref) ? sel : [ref], click: 'collapse' };
}

/** The nodes whose screen position lies inside the box. */
export function nodesInBand(g: Graph, band: Band, project: (p: Vec) => Vec): number[] {
  const [x0, x1] = [band.a.x, band.b.x].sort((p, q) => p - q);
  const [y0, y1] = [band.a.y, band.b.y].sort((p, q) => p - q);
  return g.nodes.flatMap((n) => {
    const s = project(n);
    return s.x >= x0! && s.x <= x1! && s.y >= y0! && s.y <= y1! ? [n.id] : [];
  });
}

/** The edges of the branch an edge is on (^128). */
export const branchEdges = (g: Graph, edge: number): number[] =>
  selectedSegments(g, branchOfEdge(g, edge));

/** The edges a hover outline covers: the hovered one, or with Alt the whole branch (^99, ^128). */
export function hoveredEdges(g: Graph, hover: Hover | null, alt: boolean): number[] {
  if (hover?.kind !== 'candidate') return [];
  const edge = hover.hit.edge;
  return alt ? branchEdges(g, edge) : [edge];
}

/**
 * The selection after a click that grabbed nothing, with what was pressed (^74, ^128): a curve
 * selects its nodes (Shift adds, Alt takes its branch), empty canvas deselects; null: nothing to
 * select or deselect, so draw mode begins (^54).
 */
export function afterEmptyClick(
  sel: number[],
  { curve, shift, alt }: { curve: number[]; shift: boolean; alt: boolean },
): number[] | null {
  if (!curve.length) return shift ? sel : sel.length ? [] : null;
  if (alt) return (shift ? afterBranchAdd : afterBranchClick)(sel, curve);
  return afterCurveClick(sel, curve, shift);
}

/** What a click without moving on a node does to the selection: toggles it, or leaves just it (^71, ^72). */
export function afterHandleClick(sel: number[], press: Extract<Press, { kind: 'drag' }>): number[] {
  if (press.click === 'toggle') return withoutNode(sel, press.id);
  return press.click === 'collapse' && press.group.length ? [press.id] : sel;
}

import { emptyGraph, roundToMm, type Graph } from '../model/graph';

/**
 * The stored project (`docs/data-model.md`, ^170): lengths in integer millimeters, nodes and edges
 * as tuples. `Project` is the same thing as the editor holds it, in meters.
 */
export const FILE_VERSION = 1;

export interface CameraState {
  /** World point at the center of the viewport, meters. */
  x: number;
  y: number;
  /** Pixels per meter. */
  scale: number;
  /** Radians, positive clockwise on the screen; 0 has north at the top. */
  rotation: number;
}

export interface Project {
  title: string;
  createdAt: string;
  lastUpdatedAt: string;
  camera: CameraState;
  graph: Graph;
}

export interface ProjectFile {
  version: number;
  title: string;
  createdAt: string;
  lastUpdatedAt: string;
  camera: CameraState;
  /** `[id, x, y, heading]`, x and y in millimeters. */
  nodes: [number, number, number, number][];
  /** `[id, start, end, radius, laneConfigurationId]`, the radius in millimeters or null (automatic). */
  edges: [number, number, number, number | null, number][];
  laneConfigurations: Record<string, { name: string; width: number }>;
}

const toMm = (m: number) => Math.round(m * 1000);
const toM = (mm: number) => mm / 1000;

export function toFile(p: Project): ProjectFile {
  const g = roundToMm(p.graph);
  const { x, y, scale, rotation } = p.camera;
  return {
    version: FILE_VERSION,
    title: p.title,
    createdAt: p.createdAt,
    lastUpdatedAt: p.lastUpdatedAt,
    camera: { x: toMm(x), y: toMm(y), scale, rotation },
    nodes: g.nodes.map((n) => [n.id, toMm(n.x), toMm(n.y), n.th]),
    edges: g.edges.map((e) => [
      e.id,
      e.start,
      e.end,
      e.radius === null ? null : toMm(e.radius),
      e.lane,
    ]),
    laneConfigurations: Object.fromEntries(
      Object.entries(g.lanes).map(([id, l]) => [id, { name: l.name, width: toMm(l.width) }]),
    ),
  };
}

export function fromFile(f: ProjectFile): Project {
  const graph = {
    ...emptyGraph(),
    nodes: f.nodes.map(([id, x, y, th]) => ({ id, x: toM(x), y: toM(y), th })),
    edges: f.edges.map(([id, start, end, radius, lane]) => ({
      id,
      start,
      end,
      radius: radius === null ? null : toM(radius),
      lane,
    })),
    lanes: Object.fromEntries(
      Object.entries(f.laneConfigurations).map(([id, l]) => [
        Number(id),
        { name: l.name, width: toM(l.width) },
      ]),
    ),
  };
  const { x, y, scale, rotation } = f.camera;
  return {
    title: f.title,
    createdAt: f.createdAt,
    lastUpdatedAt: f.lastUpdatedAt,
    camera: { x: toM(x), y: toM(y), scale, rotation },
    graph,
  };
}

/** A project that cannot be opened: not valid, or made by a newer version of the app. */
export class ProjectFileError extends Error {}

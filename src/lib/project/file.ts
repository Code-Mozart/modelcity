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

/**
 * Why a file is refused (^209): what the user is told depends on the kind, the console gets the
 * hat of the refusal and where in the file it went wrong.
 */
export type RefusalKind = 'not-project' | 'newer' | 'old' | 'damaged' | 'unreadable';

const CONSOLE = 'Details are in the browser console (F12).';

/** What the user reads for each kind (^192 to ^208 say which refusal is which kind). */
export const REFUSAL_TEXT: Record<
  RefusalKind,
  (v: { version?: number; current?: number }) => string
> = {
  'not-project': () => 'This is not a modelcity project file.',
  newer: ({ version, current }) =>
    `This project was made with a newer version of modelcity (it is version ${version}, this version reads up to ${current}), so it cannot be opened here. Open it with the newest version of modelcity.`,
  old: ({ version }) =>
    `This project is from an old version of modelcity (version ${version}) that this version can no longer convert, so it cannot be opened.`,
  damaged: () => `This project file is damaged, so it cannot be opened. ${CONSOLE}`,
  unreadable: () => `The file could not be read. ${CONSOLE}`,
};

/** A project that cannot be opened: the message is for the user, `hat` and `detail` for the console. */
export class ProjectFileError extends Error {
  constructor(
    readonly kind: RefusalKind,
    readonly hat: string,
    readonly detail: string,
    versions: { version?: number; current?: number } = {},
  ) {
    super(REFUSAL_TEXT[kind](versions));
  }
}

import {
  edgeOfId,
  emptyGraph,
  nodeOf,
  roundToMm,
  type GEdge,
  type GNode,
  type Graph,
} from '../model/graph';
import type { Header, MapChange } from './storage';

/**
 * The stored project (`docs/data-model.md`, ^170): lengths in integer millimeters, nodes and edges
 * as tuples. `Project` is the same thing as the editor holds it, in meters.
 */
export const FILE_VERSION = 2;

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
  /** The ids the next node and the next edge get: larger than every id in use, never reused (^1224). */
  nextNodeId: number;
  nextEdgeId: number;
}

const toMm = (m: number) => Math.round(m * 1000);
const toM = (mm: number) => mm / 1000;

const nodeRow = (n: GNode): ProjectFile['nodes'][number] => [n.id, toMm(n.x), toMm(n.y), n.th];
const edgeRow = (e: GEdge): ProjectFile['edges'][number] => [
  e.id,
  e.start,
  e.end,
  e.radius === null ? null : toMm(e.radius),
  e.lane,
];

/** The project without its map: the lane configurations are in it, the nodes and segments are not. */
export function toHeader(p: Project): Header {
  const g = roundToMm(p.graph);
  const { x, y, scale, rotation } = p.camera;
  return {
    version: FILE_VERSION,
    title: p.title,
    createdAt: p.createdAt,
    lastUpdatedAt: p.lastUpdatedAt,
    camera: { x: toMm(x), y: toMm(y), scale, rotation },
    laneConfigurations: Object.fromEntries(
      Object.entries(g.lanes).map(([id, l]) => [id, { name: l.name, width: toMm(l.width) }]),
    ),
    nextNodeId: g.nextNodeId,
    nextEdgeId: g.nextEdgeId,
  };
}

export function toFile(p: Project): ProjectFile {
  const g = roundToMm(p.graph);
  return { ...toHeader(p), nodes: g.nodes.map(nodeRow), edges: g.edges.map(edgeRow) };
}

/** The text of an export file (^163): a project that was never saved gets `stamp` for its dates. */
export const exportText = (p: Project, stamp: string) =>
  JSON.stringify(
    toFile({ ...p, createdAt: p.createdAt || stamp, lastUpdatedAt: p.lastUpdatedAt || stamp }),
    null,
    2,
  );

/** The rows of the map that are different in `to` than in `from`, found by id: a row is different if its object is (an edit makes new objects only for what it changed). */
export function mapChange(from: Graph, to: Graph): MapChange {
  return {
    nodes: to.nodes.filter((n) => nodeOf(from, n.id) !== n).map(nodeRow),
    edges: to.edges.filter((e) => edgeOfId(from, e.id) !== e).map(edgeRow),
    removedNodes: from.nodes.filter((n) => !nodeOf(to, n.id)).map((n) => n.id),
    removedEdges: from.edges.filter((e) => !edgeOfId(to, e.id)).map((e) => e.id),
  };
}

/** The camera of a stored project, in meters. */
export const cameraOf = ({ camera: { x, y, scale, rotation } }: Header): CameraState => ({
  x: toM(x),
  y: toM(y),
  scale,
  rotation,
});

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
    nextNodeId: f.nextNodeId,
    nextEdgeId: f.nextEdgeId,
  };
  return {
    title: f.title,
    createdAt: f.createdAt,
    lastUpdatedAt: f.lastUpdatedAt,
    camera: cameraOf(f),
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

/** The title of a stored project for a card; a project whose file is too damaged to have one gets a placeholder (^229). */
export const titleOf = (file: { title?: unknown }): string =>
  typeof file.title === 'string' && file.title.trim() ? file.title : '(damaged project)';

/** Whether a stored project is of an older data model than `current` (it is converted when it opens, ^1226). */
export const isOlder = (file: { version?: unknown }, current = FILE_VERSION): boolean =>
  typeof file.version === 'number' && file.version < current;

/** The toast for a project that was converted to the current data model when it opened (^1226). */
export const convertedText = (title: string) =>
  `${title} was converted to version ${FILE_VERSION} of the data model and saved`;

/** `version 1` for a project of an older version than this one reads, else nothing: the card says so after its title (^229). */
export const versionLabel = (file: { version?: unknown }, current = FILE_VERSION): string =>
  isOlder(file, current) ? `version ${String(file.version)}` : '';

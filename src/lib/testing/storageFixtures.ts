import type { ProjectFile } from '../project/file';
import type { MapChange } from '../project/storage';

/** A stored project with ids that have gaps (^1224). */
export const file = (title = 'A'): ProjectFile => ({
  version: 2,
  title,
  createdAt: '2026-11-01T00:00:00Z',
  lastUpdatedAt: '2026-11-01T00:00:05Z',
  camera: { x: 0, y: 0, scale: 4, rotation: 0 },
  nodes: [
    [0, 1000, 5000, 0],
    [1, 20000, -3000, 1.5],
    [5, 30000, 9000, 3],
  ],
  edges: [
    [0, 0, 1, null, 1],
    [3, 1, 5, 12500, 1],
  ],
  laneConfigurations: { '1': { name: 'default', width: 3000 } },
  nextNodeId: 6,
  nextEdgeId: 4,
});

export const none: MapChange = { nodes: [], edges: [], removedNodes: [], removedEdges: [] };

/**
 * The text of a project file with one big connected road network (^1249): rows of straight roads
 * (nodes `spacing` meters apart, heading east) joined by S-curves at every 8th column. It is sent
 * to the page and runs there, so it uses nothing from outside.
 */
export function makeMapText(nodes: number, spacing: number): string {
  const cols = Math.ceil(Math.sqrt(nodes));
  const rows = Math.ceil(nodes / cols);
  const nodeRows: unknown[] = [];
  const edgeRows: unknown[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      nodeRows.push([r * cols + c, c * spacing * 1000, r * spacing * 1000, 0]);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols - 1; c++)
      edgeRows.push([edgeRows.length, r * cols + c, r * cols + c + 1, null, 1]);
    for (let c = 0; c < cols && r + 1 < rows; c += 8)
      edgeRows.push([edgeRows.length, r * cols + c, (r + 1) * cols + c, null, 1]);
  }
  return JSON.stringify({
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
    nodes: nodeRows,
    edges: edgeRows,
    laneConfigurations: { '1': { name: 'default', width: 3000 } },
    nextNodeId: nodeRows.length,
    nextEdgeId: edgeRows.length,
  });
}

/**
 * Graph representation and topological analysis for NetCollaborate
 */

function buildNetworkGraph(nodes = [], edges = []) {
  const nodeMap = new Map();
  const adjacency = new Map();
  const edgeMap = new Map();

  nodes.forEach(node => {
    nodeMap.set(node.id, node);
    adjacency.set(node.id, []);
  });

  edges.forEach(edge => {
    const { source, target } = edge;
    if (adjacency.has(source) && adjacency.has(target)) {
      adjacency.get(source).push({
        neighborId: target,
        edgeId: edge.id,
        linkType: edge.data?.linkType || 'ethernet',
        status: edge.data?.status || 'connected',
        bandwidth: edge.data?.bandwidth || '1 Gbps',
        latency: edge.data?.latency || 2
      });

      adjacency.get(target).push({
        neighborId: source,
        edgeId: edge.id,
        linkType: edge.data?.linkType || 'ethernet',
        status: edge.data?.status || 'connected',
        bandwidth: edge.data?.bandwidth || '1 Gbps',
        latency: edge.data?.latency || 2
      });
    }

    const key1 = `${source}->${target}`;
    const key2 = `${target}->${source}`;
    edgeMap.set(key1, edge);
    edgeMap.set(key2, edge);
  });

  return {
    nodeMap,
    adjacency,
    edgeMap,
    getNeighbors: (id) => adjacency.get(id) || [],
    getNode: (id) => nodeMap.get(id),
    getEdge: (src, dst) => edgeMap.get(`${src}->${dst}`) || edgeMap.get(`${dst}->${src}`)
  };
}

/**
 * Detects Layer 2 switching loops using DFS cycle detection
 * Only traverses through switches and hubs
 */
function detectSwitchLoops(nodes = [], edges = []) {
  const switchNodeIds = new Set(
    nodes
      .filter(n => ['switch', 'hub'].includes((n.type || n.data?.type || '').toLowerCase()))
      .map(n => n.id)
  );

  const adj = new Map();
  switchNodeIds.forEach(id => adj.set(id, []));

  edges.forEach(e => {
    if (switchNodeIds.has(e.source) && switchNodeIds.has(e.target)) {
      adj.get(e.source).push({ to: e.target, edgeId: e.id });
      adj.get(e.target).push({ to: e.source, edgeId: e.id });
    }
  });

  const visited = new Set();
  const loops = [];

  function dfs(current, parent, path, edgePath) {
    visited.add(current);
    const neighbors = adj.get(current) || [];

    for (const { to, edgeId } of neighbors) {
      if (to === parent) continue;

      if (visited.has(to)) {
        // Cycle detected
        const cycleStartIndex = path.indexOf(to);
        if (cycleStartIndex !== -1) {
          const cycleNodes = path.slice(cycleStartIndex);
          loops.push({
            nodes: cycleNodes,
            edges: [...edgePath.slice(cycleStartIndex), edgeId]
          });
        }
      } else {
        dfs(to, current, [...path, to], [...edgePath, edgeId]);
      }
    }
  }

  switchNodeIds.forEach(id => {
    if (!visited.has(id)) {
      dfs(id, null, [id], []);
    }
  });

  return loops;
}

module.exports = {
  buildNetworkGraph,
  detectSwitchLoops
};

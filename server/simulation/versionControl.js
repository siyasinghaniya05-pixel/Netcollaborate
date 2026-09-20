/**
 * Version Control Engine for NetCollaborate
 * Pure functions for snapshot generation, visual diffing, and restoration.
 * Rules: Never mutate inputs — always deep-clone.
 */

function deepClone(data) {
  return JSON.parse(JSON.stringify(data));
}

/**
 * Creates an immutable snapshot from nodes and edges.
 * @param {Array} nodes
 * @param {Array} edges
 * @param {Object} meta { id, name, description, author, healthScore }
 * @returns {Object} Snapshot object
 */
function createSnapshot(nodes = [], edges = [], meta = {}) {
  const clonedNodes = deepClone(nodes);
  const clonedEdges = deepClone(edges);

  const deviceTypes = {};
  const subnets = new Set();

  clonedNodes.forEach(node => {
    const type = node.type || node.data?.type || 'unknown';
    deviceTypes[type] = (deviceTypes[type] || 0) + 1;

    // Detect subnets if IP present
    const ip = node.data?.ip;
    if (ip && typeof ip === 'string') {
      const parts = ip.split('.');
      if (parts.length === 4) {
        subnets.add(`${parts[0]}.${parts[1]}.${parts[2]}.0`);
      }
    }
  });

  return {
    id: meta.id || `snap-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: meta.name || `Snapshot ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    description: meta.description || 'Manual network checkpoint',
    author: meta.author || 'Collaborator',
    createdAt: new Date().toISOString(),
    stats: {
      nodeCount: clonedNodes.length,
      edgeCount: clonedEdges.length,
      deviceTypes,
      subnetsCount: subnets.size,
      healthScore: typeof meta.healthScore === 'number' ? meta.healthScore : 100
    },
    nodes: clonedNodes,
    edges: clonedEdges
  };
}

/**
 * Compares two snapshots (or a snapshot against current network state)
 * and returns a structured diff: added, removed, and modified nodes & edges.
 * @param {Object} snapA Baseline snapshot or state { nodes, edges }
 * @param {Object} snapB Target/newer snapshot or state { nodes, edges }
 * @returns {Object} Diff result
 */
function compareSnapshots(snapA = { nodes: [], edges: [] }, snapB = { nodes: [], edges: [] }) {
  const nodesA = deepClone(snapA.nodes || []);
  const edgesA = deepClone(snapA.edges || []);
  const nodesB = deepClone(snapB.nodes || []);
  const edgesB = deepClone(snapB.edges || []);

  const mapA = new Map(nodesA.map(n => [n.id, n]));
  const mapB = new Map(nodesB.map(n => [n.id, n]));

  const addedNodes = [];
  const removedNodes = [];
  const modifiedNodes = [];
  const unchangedNodes = [];

  // Check nodes in B against A
  for (const nodeB of nodesB) {
    if (!mapA.has(nodeB.id)) {
      addedNodes.push({
        id: nodeB.id,
        name: nodeB.data?.name || nodeB.id,
        type: nodeB.type || nodeB.data?.type,
        ip: nodeB.data?.ip || 'N/A'
      });
    } else {
      const nodeA = mapA.get(nodeB.id);
      const changes = [];

      // Check key configuration fields
      const dataA = nodeA.data || {};
      const dataB = nodeB.data || {};

      if (dataA.ip !== dataB.ip) {
        changes.push({ field: 'IP Address', before: dataA.ip || '(none)', after: dataB.ip || '(none)' });
      }
      if (dataA.subnetMask !== dataB.subnetMask) {
        changes.push({ field: 'Subnet Mask', before: dataA.subnetMask || '(none)', after: dataB.subnetMask || '(none)' });
      }
      if (dataA.gateway !== dataB.gateway) {
        changes.push({ field: 'Gateway', before: dataA.gateway || '(none)', after: dataB.gateway || '(none)' });
      }
      if (dataA.dns !== dataB.dns) {
        changes.push({ field: 'DNS', before: dataA.dns || '(none)', after: dataB.dns || '(none)' });
      }
      if (dataA.vlan !== dataB.vlan) {
        changes.push({ field: 'VLAN', before: dataA.vlan || '(none)', after: dataB.vlan || '(none)' });
      }
      if (dataA.status !== dataB.status) {
        changes.push({ field: 'Status', before: dataA.status || 'up', after: dataB.status || 'up' });
      }

      // Check routing table size/content
      const routesA = dataA.routingTable || [];
      const routesB = dataB.routingTable || [];
      if (JSON.stringify(routesA) !== JSON.stringify(routesB)) {
        changes.push({
          field: 'Routing Table',
          before: `${routesA.length} route(s)`,
          after: `${routesB.length} route(s)`
        });
      }

      // Check position change
      const posA = nodeA.position || { x: 0, y: 0 };
      const posB = nodeB.position || { x: 0, y: 0 };
      if (Math.abs(posA.x - posB.x) > 10 || Math.abs(posA.y - posB.y) > 10) {
        changes.push({
          field: 'Position',
          before: `(${Math.round(posA.x)}, ${Math.round(posA.y)})`,
          after: `(${Math.round(posB.x)}, ${Math.round(posB.y)})`
        });
      }

      if (changes.length > 0) {
        modifiedNodes.push({
          id: nodeB.id,
          name: dataB.name || nodeB.id,
          type: nodeB.type || dataB.type,
          changes
        });
      } else {
        unchangedNodes.push(nodeB.id);
      }
    }
  }

  // Check nodes in A removed in B
  for (const nodeA of nodesA) {
    if (!mapB.has(nodeA.id)) {
      removedNodes.push({
        id: nodeA.id,
        name: nodeA.data?.name || nodeA.id,
        type: nodeA.type || nodeA.data?.type,
        ip: nodeA.data?.ip || 'N/A'
      });
    }
  }

  // Compare Edges
  const edgeMapA = new Map(edgesA.map(e => [`${e.source}->${e.target}`, e]));
  const edgeMapB = new Map(edgesB.map(e => [`${e.source}->${e.target}`, e]));

  const addedEdges = [];
  const removedEdges = [];
  const modifiedEdges = [];

  for (const edgeB of edgesB) {
    const key = `${edgeB.source}->${edgeB.target}`;
    const reverseKey = `${edgeB.target}->${edgeB.source}`;
    const matchA = edgeMapA.get(key) || edgeMapA.get(reverseKey);

    if (!matchA) {
      addedEdges.push({
        id: edgeB.id,
        source: edgeB.source,
        target: edgeB.target,
        linkType: edgeB.data?.linkType || 'ethernet'
      });
    } else {
      const dataA = matchA.data || {};
      const dataB = edgeB.data || {};
      const edgeChanges = [];

      if (dataA.linkType !== dataB.linkType) {
        edgeChanges.push({ field: 'Link Type', before: dataA.linkType || 'ethernet', after: dataB.linkType || 'ethernet' });
      }
      if (dataA.bandwidth !== dataB.bandwidth) {
        edgeChanges.push({ field: 'Bandwidth', before: dataA.bandwidth || '1 Gbps', after: dataB.bandwidth || '1 Gbps' });
      }
      if (dataA.latency !== dataB.latency) {
        edgeChanges.push({ field: 'Latency', before: `${dataA.latency ?? 2}ms`, after: `${dataB.latency ?? 2}ms` });
      }
      if (dataA.status !== dataB.status) {
        edgeChanges.push({ field: 'Link Status', before: dataA.status || 'connected', after: dataB.status || 'connected' });
      }

      if (edgeChanges.length > 0) {
        modifiedEdges.push({
          id: edgeB.id,
          source: edgeB.source,
          target: edgeB.target,
          changes: edgeChanges
        });
      }
    }
  }

  for (const edgeA of edgesA) {
    const key = `${edgeA.source}->${edgeA.target}`;
    const reverseKey = `${edgeA.target}->${edgeA.source}`;
    if (!edgeMapB.has(key) && !edgeMapB.has(reverseKey)) {
      removedEdges.push({
        id: edgeA.id,
        source: edgeA.source,
        target: edgeA.target,
        linkType: edgeA.data?.linkType || 'ethernet'
      });
    }
  }

  const totalChanges =
    addedNodes.length +
    removedNodes.length +
    modifiedNodes.length +
    addedEdges.length +
    removedEdges.length +
    modifiedEdges.length;

  return {
    hasChanges: totalChanges > 0,
    totalChanges,
    summary: {
      addedNodesCount: addedNodes.length,
      removedNodesCount: removedNodes.length,
      modifiedNodesCount: modifiedNodes.length,
      addedEdgesCount: addedEdges.length,
      removedEdgesCount: removedEdges.length,
      modifiedEdgesCount: modifiedEdges.length,
      unchangedNodesCount: unchangedNodes.length
    },
    nodes: {
      added: addedNodes,
      removed: removedNodes,
      modified: modifiedNodes
    },
    edges: {
      added: addedEdges,
      removed: removedEdges,
      modified: modifiedEdges
    }
  };
}

/**
 * Safely restores a snapshot by deep-cloning its nodes and edges.
 * @param {Object} snapshot
 * @returns {Object} Restored state { nodes, edges, snapshotId, snapshotName }
 */
function restoreSnapshot(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.nodes) || !Array.isArray(snapshot.edges)) {
    throw new Error('Invalid snapshot structure for restoration');
  }

  return {
    snapshotId: snapshot.id,
    snapshotName: snapshot.name,
    restoredAt: new Date().toISOString(),
    nodes: deepClone(snapshot.nodes),
    edges: deepClone(snapshot.edges)
  };
}

module.exports = {
  createSnapshot,
  compareSnapshots,
  restoreSnapshot
};

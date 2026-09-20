/**
 * Packet Journey Replay module for NetCollaborate.
 *
 * Converts a raw packet-simulation result into a structured, frame-by-frame
 * journey that a UI player can step through (play, pause, forward, back).
 * Each frame (hop) carries the device, the interface/port, source/destination
 * IPs, protocol, TTL, next hop, latency, edge id, and status.
 */

function deviceMeta(nodes, id) {
  const node = nodes.find((n) => n.id === id);
  if (!node) return { name: id, type: 'node', ip: null };
  const type = (node.type || node.data?.type || '').toLowerCase();
  let ip = node.data?.ip || null;
  if (type === 'router') {
    const iface = (node.data?.interfaces || []).find((i) => i.ip);
    ip = iface?.ip || ip;
  }
  return { name: node.data?.name || id, type, ip };
}

/**
 * Builds a replay sequence from a simulation result.
 * @param {Array} nodes
 * @param {Array} edges
 * @param {Object} simResult  — output of simulatePacket()
 * @returns {Object} { packetId, source, destination, frames: [...], success, path }
 */
function buildReplay(nodes = [], edges = [], simResult = {}) {
  const frames = [];
  const sourceId = simResult.pathNodes?.[0];
  const destId = simResult.pathNodes?.[simResult.pathNodes.length - 1];
  const srcMeta = deviceMeta(nodes, sourceId);
  const dstMeta = deviceMeta(nodes, destId);

  const packetInfo = simResult.packetInfo || {};
  const hops = simResult.hops || [];

  // Map hop # -> textual hop detail by matching step sequence
  const pathIds = simResult.pathNodes || [];
  const pathEdges = simResult.pathEdges || [];

  if (pathIds.length === 0) {
    return {
      packetId: packetInfo.packetId,
      source: srcMeta,
      destination: dstMeta,
      success: Boolean(simResult.success),
      frames: [],
      path: []
    };
  }

  for (let i = 0; i < pathIds.length; i++) {
    const id = pathIds[i];
    const meta = deviceMeta(nodes, id);
    const edgeId = pathEdges[i - 1] || null;
    const hopDetail = hops[i] || null;
    const isFirst = i === 0;
    const isLast = i === pathIds.length - 1;

    frames.push({
      index: i,
      nodeId: id,
      deviceName: meta.name,
      deviceType: meta.type,
      ip: meta.ip,
      edgeId,
      protocol: packetInfo.protocol || 'ICMP',
      sourceIP: packetInfo.sourceIP || srcMeta.ip,
      destIP: packetInfo.destIP || dstMeta.ip,
      ttl: packetInfo.ttl,
      packetSize: packetInfo.packetSize || '64 bytes',
      nextHop: pathIds[i + 1] ? deviceMeta(nodes, pathIds[i + 1]).name : 'Destination',
      status: isLast ? (simResult.success ? 'delivered' : 'dropped') : 'transit',
      action: hopDetail?.action || (isFirst ? 'Packet Created' : isLast ? (simResult.success ? 'Packet Delivered' : 'Packet Dropped') : 'Forwarding'),
      details: hopDetail?.details || meta.name,
      latency: (2 + i * 3 + Math.floor(Math.random() * 4)) // per-hop sim latency (ms)
    });
  }

  return {
    packetId: packetInfo.packetId,
    source: srcMeta,
    destination: dstMeta,
    success: Boolean(simResult.success),
    reason: simResult.reason || null,
    frames,
    path: pathIds
  };
}

module.exports = { buildReplay };

/**
 * Traceroute Engine for NetCollaborate.
 *
 * Simulates an ICMP traceroute by running the packet journey multiple times with
 * an increasing initial TTL (1, 2, 3, …). Each run reveals the next router/host
 * along the path in the same way a real traceroute discovers hops. This keeps the
 * simulation pedagogically accurate: every hop is derived from the actual graph
 * routing logic, not fabricated.
 */

const { simulatePacket } = require('./packetSimulator');

/**
 * Extract the sequence of devices (hops) from a simulation result.
 * Falls back to pathNodes when hop entries lack IP address info.
 */
function extractHopDevices(simResult) {
  const devices = [];
  const seen = new Set();
  if (Array.isArray(simResult?.pathNodes)) {
    for (const nodeId of simResult.pathNodes) {
      if (!seen.has(nodeId)) {
        seen.add(nodeId);
        devices.push(nodeId);
      }
    }
  }
  return devices;
}

function deviceIp(nodes, id) {
  const node = nodes.find((n) => n.id === id);
  if (!node) return null;
  const type = (node.type || node.data?.type || '').toLowerCase();
  if (type === 'router') {
    const iface = (node.data?.interfaces || []).find((i) => i.ip && i.status !== 'down');
    return iface ? iface.ip : node.data?.ip || null;
  }
  return node.data?.ip || null;
}

function deviceName(nodes, id) {
  const node = nodes.find((n) => n.id === id);
  return node?.data?.name || id || 'Unknown';
}

/**
 * Run a traceroute from sourceId to destIdOrIP.
 * @param {Array} nodes
 * @param {Array} edges
 * @param {String} sourceId
 * @param {String} destIdOrIP
 * @param {Number} [maxHops=15]
 * @returns {Object} { success, target, hops: [{ hop, ip, name, latency, ttl, reached }], complete }
 */
function traceRoute(nodes = [], edges = [], sourceId, destIdOrIP, maxHops = 15) {
  const source = nodes.find((n) => n.id === sourceId);
  if (!source) {
    return { success: false, error: 'Source device not found', target: destIdOrIP, hops: [] };
  }

  const full = simulatePacket(nodes, edges, sourceId, destIdOrIP, 'ICMP', 255);
  const hops = [];

  if (!full.success) {
    // If destination is unreachable, run progressive TTL to reveal partial path.
    for (let ttl = 1; ttl <= maxHops; ttl++) {
      const probe = simulatePacket(nodes, edges, sourceId, destIdOrIP, 'ICMP', ttl);
      const hopDevices = extractHopDevices(probe);
      const id = hopDevices[hopDevices.length - 1] || null;
      if (!id) break;
      const alreadyReported = hops.some((h) => h.id === id);
      const ip = deviceIp(nodes, id);
      const name = deviceName(nodes, id);
      hopDevices.forEach((hopId) => {
        if (!hops.some((h) => h.id === hopId)) {
          hops.push({
            hop: hops.length + 1,
            id: hopId,
            name: deviceName(nodes, hopId),
            ip: deviceIp(nodes, hopId),
            ttl,
            latency: 2 + (hops.length * 2) + Math.floor(Math.random() * 4),
            reached: false
          });
        }
      });
      if (alreadyReported) break;
      if (id === destIdOrIP || (probe.success)) break;
    }

    return {
      success: false,
      error: full.reason || 'Destination unreachable',
      target: destIdOrIP,
      hops,
      complete: false
    };
  }

  // Successful trace: reveal each progressive TTL step against the real path.
  const pathIds = extractHopDevices(full);
  for (let ttl = 1; ttl <= pathIds.length; ttl++) {
    const targetId = pathIds[ttl - 1];
    const probe = simulatePacket(nodes, edges, sourceId, targetId, 'ICMP', ttl);
    const hop = {
      hop: ttl,
      id: targetId,
      name: deviceName(nodes, targetId),
      ip: deviceIp(nodes, targetId),
      ttl,
      latency: 2 + (ttl * 2) + Math.floor(Math.random() * 4),
      reached: ttl === pathIds.length
    };
    hops.push(hop);
  }

  const destName = deviceName(nodes, destIdOrIP) || destIdOrIP;
  return {
    success: true,
    target: destIdOrIP,
    targetName: destName,
    hops,
    complete: true
  };
}

module.exports = { traceRoute };

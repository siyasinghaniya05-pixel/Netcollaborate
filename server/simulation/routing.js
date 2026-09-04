/**
 * Routing logic and Longest Prefix Match (LPM) for NetCollaborate
 */
const { ipToInt, isValidIPv4, isValidSubnetMask, maskToCIDR } = require('./validator');

/**
 * Perform Longest Prefix Match lookup in router's routing table
 * @param {string} destinationIP
 * @param {Array} routingTable - Array of { destination, mask, nextHop, interface, metric }
 * @returns {Object|null} matched route or null
 */
function longestPrefixMatch(destinationIP, routingTable = []) {
  if (!isValidIPv4(destinationIP) || !Array.isArray(routingTable)) {
    return null;
  }

  const destInt = ipToInt(destinationIP);
  let bestMatch = null;
  let maxPrefixLength = -1;

  for (const route of routingTable) {
    const { destination, mask, nextHop, interface: iface } = route;
    if (!destination || !mask) continue;

    const routeDestInt = ipToInt(destination);
    const routeMaskInt = ipToInt(mask);

    // Check if destination IP matches this subnet
    if ((destInt & routeMaskInt) === (routeDestInt & routeMaskInt)) {
      const prefixLength = maskToCIDR(mask);
      if (prefixLength > maxPrefixLength) {
        maxPrefixLength = prefixLength;
        bestMatch = {
          destination,
          mask,
          prefixLength,
          nextHop: nextHop || 'Direct',
          interface: iface || 'G0/0',
          metric: route.metric || 1
        };
      }
    }
  }

  return bestMatch;
}

/**
 * Resolves next hop IP and interface for a given router
 * Checks directly connected interfaces first, then routing table
 */
function resolveRouterForwarding(routerNode, destIP) {
  const interfaces = routerNode.data?.interfaces || [];
  const routingTable = routerNode.data?.routingTable || [];

  // 1. Check directly connected interfaces
  for (const iface of interfaces) {
    if (iface.ip && iface.mask && iface.status !== 'down') {
      const ifaceNet = (ipToInt(iface.ip) & ipToInt(iface.mask)) >>> 0;
      const destNet = (ipToInt(destIP) & ipToInt(iface.mask)) >>> 0;
      if (ifaceNet === destNet) {
        return {
          type: 'DIRECT',
          interface: iface.name,
          nextHopIP: destIP,
          matchedPrefix: `${iface.ip}/${maskToCIDR(iface.mask)}`
        };
      }
    }
  }

  // 2. Perform Longest Prefix Match on static routing table
  const matchedRoute = longestPrefixMatch(destIP, routingTable);
  if (matchedRoute) {
    return {
      type: matchedRoute.nextHop === 'Direct' ? 'DIRECT' : 'NEXT_HOP',
      interface: matchedRoute.interface,
      nextHopIP: matchedRoute.nextHop,
      matchedRoute
    };
  }

  return null; // Destination Unreachable - No Route
}

/**
 * BFS to find path through Layer 2 devices (Switches and Hubs)
 * between a start device and a target device/interface
 */
function findL2Path(graph, startNodeId, targetNodeId) {
  if (startNodeId === targetNodeId) return [startNodeId];

  const queue = [[startNodeId]];
  const visited = new Set([startNodeId]);

  while (queue.length > 0) {
    const currentPath = queue.shift();
    const currentNodeId = currentPath[currentPath.length - 1];

    if (currentNodeId === targetNodeId) {
      return currentPath;
    }

    const neighbors = graph.getNeighbors(currentNodeId);
    for (const neighbor of neighbors) {
      const neighborNode = graph.getNode(neighbor.neighborId);
      if (!neighborNode) continue;

      const neighborType = (neighborNode.type || neighborNode.data?.type || '').toLowerCase();

      // We can only traverse through switches, hubs, and access points, or reach the target
      if (neighbor.neighborId === targetNodeId) {
        return [...currentPath, neighbor.neighborId];
      }

      if (['switch', 'hub', 'accesspoint'].includes(neighborType) && !visited.has(neighbor.neighborId)) {
        visited.add(neighbor.neighborId);
        queue.push([...currentPath, neighbor.neighborId]);
      }
    }
  }

  return null; // No Layer 2 path found
}

module.exports = {
  longestPrefixMatch,
  resolveRouterForwarding,
  findL2Path
};

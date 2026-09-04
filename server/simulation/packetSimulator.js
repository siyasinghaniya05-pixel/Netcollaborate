/**
 * End-to-End Packet Journey Simulator and ICMP Ping Engine for NetCollaborate
 */
const { buildNetworkGraph } = require('./graph');
const { areInSameSubnet, isValidIPv4, maskToCIDR, getNetworkAddress } = require('./validator');
const { resolveRouterForwarding, findL2Path } = require('./routing');

/**
 * Simulates end-to-end packet transmission between source and destination nodes
 */
function simulatePacket(nodes = [], edges = [], sourceId, destId, protocol = 'ICMP', initialTTL = 64) {
  const graph = buildNetworkGraph(nodes, edges);
  const sourceNode = graph.getNode(sourceId);
  const destNode = graph.getNode(destId);

  const packetId = Math.floor(1000 + Math.random() * 9000);
  const hops = [];
  const pathNodes = [];
  const pathEdges = [];
  const animationSteps = [];

  const addHop = (stepIndex, deviceName, deviceType, action, details, status = 'success') => {
    hops.push({
      step: stepIndex,
      device: deviceName,
      type: deviceType,
      action,
      details,
      status,
      timestamp: new Date().toLocaleTimeString()
    });
  };

  if (!sourceNode) {
    return {
      success: false,
      error: 'Source device not found on canvas',
      hops,
      pathNodes,
      pathEdges,
      animationSteps
    };
  }

  if (!destNode) {
    return {
      success: false,
      error: 'Destination device not found on canvas',
      hops,
      pathNodes,
      pathEdges,
      animationSteps
    };
  }

  const sName = sourceNode.data?.name || sourceNode.id;
  const dName = destNode.data?.name || destNode.id;
  const sType = sourceNode.type || sourceNode.data?.type || 'pc';
  const dType = destNode.type || destNode.data?.type || 'pc';

  // Check if devices are powered on / status is up
  if (sourceNode.data?.status === 'down') {
    addHop(1, sName, sType, 'Interface Down', `${sName} interface is shut down (Disabled).`, 'error');
    return {
      success: false,
      reason: `${sName} is turned off or interface is administratively down.`,
      solution: `Enable the device status in the configuration panel.`,
      hops,
      pathNodes: [sourceNode.id],
      pathEdges: [],
      animationSteps: [{ type: 'node', id: sourceNode.id, status: 'dropped' }]
    };
  }

  if (destNode.data?.status === 'down') {
    addHop(1, dName, dType, 'Host Down', `Destination ${dName} interface is shut down.`, 'error');
    return {
      success: false,
      reason: `Destination ${dName} is offline or shut down.`,
      solution: `Enable ${dName} status in the configuration panel.`,
      hops,
      pathNodes: [sourceNode.id],
      pathEdges: [],
      animationSteps: [{ type: 'node', id: sourceNode.id, status: 'dropped' }]
    };
  }

  const sourceIP = sourceNode.data?.ip;
  const sourceMask = sourceNode.data?.subnetMask || '255.255.255.0';
  const sourceGateway = sourceNode.data?.gateway;

  let destIP = destNode.data?.ip;
  // If destination is a router, pick its first configured interface IP
  if (dType === 'router' && (!destIP || destIP === '')) {
    const rIfaces = destNode.data?.interfaces || [];
    const activeIface = rIfaces.find(i => i.ip);
    if (activeIface) destIP = activeIface.ip;
  }

  if (!isValidIPv4(sourceIP)) {
    addHop(1, sName, sType, 'Invalid Source IP', `${sName} has no valid IPv4 address assigned.`, 'error');
    return {
      success: false,
      reason: `Source ${sName} has an invalid or missing IP address.`,
      solution: `Assign a valid IPv4 address to ${sName} (e.g. 192.168.1.10).`,
      hops,
      pathNodes: [sourceNode.id],
      pathEdges: [],
      animationSteps: [{ type: 'node', id: sourceNode.id, status: 'dropped' }]
    };
  }

  if (!isValidIPv4(destIP)) {
    addHop(1, sName, sType, 'Invalid Destination IP', `Target ${dName} has no valid IPv4 address.`, 'error');
    return {
      success: false,
      reason: `Destination ${dName} has an invalid or missing IP address.`,
      solution: `Assign a valid IPv4 address to ${dName}.`,
      hops,
      pathNodes: [sourceNode.id],
      pathEdges: [],
      animationSteps: [{ type: 'node', id: sourceNode.id, status: 'dropped' }]
    };
  }

  let currentTTL = initialTTL;
  let currentHopIndex = 1;

  pathNodes.push(sourceNode.id);
  animationSteps.push({ type: 'node', id: sourceNode.id, status: 'success', label: `Start: ${sName}` });

  addHop(
    currentHopIndex++,
    sName,
    sType,
    `Crafting ${protocol} Packet`,
    `Src IP: ${sourceIP}, Dst IP: ${destIP}, Protocol: ${protocol}, TTL: ${currentTTL}`,
    'success'
  );

  // Check if Source and Destination are in the same local subnet
  const isSameSubnet = areInSameSubnet(sourceIP, destIP, sourceMask);

  if (isSameSubnet) {
    addHop(
      currentHopIndex++,
      sName,
      sType,
      'Subnet Evaluation',
      `Destination ${destIP} is on the LOCAL subnet (${getNetworkAddress(sourceIP, sourceMask)}/${maskToCIDR(sourceMask)}). Initiating ARP / Layer 2 delivery.`,
      'success'
    );

    // Look for Layer 2 path through switches/hubs/direct link
    const l2Path = findL2Path(graph, sourceNode.id, destNode.id);
    if (!l2Path) {
      addHop(
        currentHopIndex++,
        sName,
        sType,
        'Host Unreachable',
        `No Layer 2 physical connection exists between ${sName} and ${dName}.`,
        'error'
      );
      animationSteps.push({ type: 'node', id: sourceNode.id, status: 'dropped' });

      return {
        success: false,
        reason: `No physical or switch connection between ${sName} and ${dName}.`,
        solution: `Connect both devices to the same Switch or connect them directly using an Ethernet cable.`,
        hops,
        pathNodes,
        pathEdges,
        animationSteps,
        packetInfo: {
          packetId,
          sourceIP,
          destIP,
          protocol,
          ttl: currentTTL,
          packetSize: '64 bytes',
          status: 'Dropped'
        }
      };
    }

    // Traverse L2 path
    for (let i = 0; i < l2Path.length - 1; i++) {
      const u = l2Path[i];
      const v = l2Path[i + 1];
      const edge = graph.getEdge(u, v);
      const vNode = graph.getNode(v);
      const vName = vNode.data?.name || vNode.id;
      const vType = vNode.type || vNode.data?.type || 'switch';

      if (edge) {
        pathEdges.push(edge.id);
        animationSteps.push({ type: 'edge', id: edge.id, source: u, target: v, status: 'success' });
      }
      pathNodes.push(v);
      animationSteps.push({ type: 'node', id: v, status: 'success', label: vName });

      if (i + 1 < l2Path.length - 1) {
        addHop(
          currentHopIndex++,
          vName,
          vType,
          'Forwarding Frame',
          `Switch forwarding frame out port connected to next device based on MAC address table.`,
          'success'
        );
      }
    }

    // Delivered to destination!
    addHop(
      currentHopIndex++,
      dName,
      dType,
      'Packet Delivered',
      `Destination host ${dName} accepted ${protocol} packet. Echo Reply queued.`,
      'success'
    );

    return {
      success: true,
      reason: 'Packet delivered successfully over local subnet.',
      hops,
      pathNodes,
      pathEdges,
      animationSteps,
      stats: {
        latency: 8 + Math.floor(Math.random() * 6),
        hopsCount: pathNodes.length,
        ttlRemaining: currentTTL
      },
      packetInfo: {
        packetId,
        sourceIP,
        destIP,
        protocol,
        ttl: currentTTL,
        packetSize: '64 bytes',
        status: 'Delivered'
      }
    };
  }

  // --- Remote Subnet Delivery via Gateway & Routers ---
  addHop(
    currentHopIndex++,
    sName,
    sType,
    'Subnet Evaluation',
    `Destination ${destIP} is on a REMOTE network. Forwarding packet to Default Gateway.`,
    'success'
  );

  if (!sourceGateway || !isValidIPv4(sourceGateway)) {
    addHop(
      currentHopIndex++,
      sName,
      sType,
      'Missing Gateway',
      `${sName} has no Default Gateway configured to route outside its local subnet.`,
      'error'
    );
    animationSteps.push({ type: 'node', id: sourceNode.id, status: 'dropped' });

    return {
      success: false,
      reason: `Default Gateway missing or invalid on ${sName}.`,
      solution: `Configure a Default Gateway on ${sName} matching the local Router interface IP (e.g. ${sourceIP.substring(0, sourceIP.lastIndexOf('.'))}.1).`,
      hops,
      pathNodes,
      pathEdges,
      animationSteps,
      packetInfo: {
        packetId,
        sourceIP,
        destIP,
        protocol,
        ttl: currentTTL,
        packetSize: '64 bytes',
        status: 'Dropped'
      }
    };
  }

  // Locate the device/router holding sourceGateway
  let gatewayNode = null;
  let gatewayInterfaceName = '';

  for (const node of nodes) {
    const type = (node.type || node.data?.type || '').toLowerCase();
    if (type === 'router') {
      const ifaces = node.data?.interfaces || [];
      const match = ifaces.find(i => i.ip === sourceGateway && i.status !== 'down');
      if (match) {
        gatewayNode = node;
        gatewayInterfaceName = match.name;
        break;
      }
    } else if (node.data?.ip === sourceGateway) {
      gatewayNode = node;
      break;
    }
  }

  if (!gatewayNode) {
    addHop(
      currentHopIndex++,
      sName,
      sType,
      'ARP Gateway Timeout',
      `No active router interface found with gateway IP ${sourceGateway}.`,
      'error'
    );
    animationSteps.push({ type: 'node', id: sourceNode.id, status: 'dropped' });

    return {
      success: false,
      reason: `Default Gateway ${sourceGateway} does not exist or router interface is down.`,
      solution: `Configure a Router interface with IP ${sourceGateway} and connect it to the local switch.`,
      hops,
      pathNodes,
      pathEdges,
      animationSteps,
      packetInfo: {
        packetId,
        sourceIP,
        destIP,
        protocol,
        ttl: currentTTL,
        packetSize: '64 bytes',
        status: 'Dropped'
      }
    };
  }

  // Find L2 path from source to gateway
  const l2ToGateway = findL2Path(graph, sourceNode.id, gatewayNode.id);
  if (!l2ToGateway) {
    addHop(
      currentHopIndex++,
      sName,
      sType,
      'Gateway Unreachable',
      `Cannot reach Default Gateway ${gatewayNode.data?.name || gatewayNode.id} over Layer 2 connection.`,
      'error'
    );
    animationSteps.push({ type: 'node', id: sourceNode.id, status: 'dropped' });

    return {
      success: false,
      reason: `Default Gateway is not physically connected to the same switch network as ${sName}.`,
      solution: `Connect the Router interface to the local switch.`,
      hops,
      pathNodes,
      pathEdges,
      animationSteps,
      packetInfo: {
        packetId,
        sourceIP,
        destIP,
        protocol,
        ttl: currentTTL,
        packetSize: '64 bytes',
        status: 'Dropped'
      }
    };
  }

  // Traverse to Gateway
  for (let i = 0; i < l2ToGateway.length - 1; i++) {
    const u = l2ToGateway[i];
    const v = l2ToGateway[i + 1];
    const edge = graph.getEdge(u, v);
    const vNode = graph.getNode(v);
    const vName = vNode.data?.name || vNode.id;
    const vType = vNode.type || vNode.data?.type || 'switch';

    if (edge) {
      pathEdges.push(edge.id);
      animationSteps.push({ type: 'edge', id: edge.id, source: u, target: v, status: 'success' });
    }
    pathNodes.push(v);
    animationSteps.push({ type: 'node', id: v, status: 'success', label: vName });

    if (vNode.id !== gatewayNode.id) {
      addHop(
        currentHopIndex++,
        vName,
        vType,
        'L2 Frame Forwarding',
        `Switch forwarding frame towards Default Gateway ${sourceGateway}.`,
        'success'
      );
    }
  }

  // Router loop: hop through routers until we reach destination or drop
  let currentRouter = gatewayNode;
  const visitedRouters = new Set();
  const maxRouterHops = 15;
  let routerHopCount = 0;

  while (currentRouter && routerHopCount < maxRouterHops) {
    routerHopCount++;
    const rName = currentRouter.data?.name || currentRouter.id;
    visitedRouters.add(currentRouter.id);

    // Decrement TTL
    currentTTL -= 1;
    if (currentTTL <= 0) {
      addHop(
        currentHopIndex++,
        rName,
        'router',
        'TTL Expired in Transit',
        `Time to Live (TTL) exceeded 0 at ${rName}. ICMP Time Exceeded sent back to source.`,
        'error'
      );
      animationSteps.push({ type: 'node', id: currentRouter.id, status: 'dropped' });

      return {
        success: false,
        reason: `Packet dropped: TTL expired in transit. Possible routing loop between routers.`,
        solution: `Check router static routing tables for reciprocal loops.`,
        hops,
        pathNodes,
        pathEdges,
        animationSteps,
        packetInfo: {
          packetId,
          sourceIP,
          destIP,
          protocol,
          ttl: 0,
          packetSize: '64 bytes',
          status: 'Dropped (TTL Expired)'
        }
      };
    }

    // Check Router Firewall rules if configured
    const fwRules = currentRouter.data?.firewallRules || [];
    const blockedRule = fwRules.find(
      rule => rule.action === 'deny' &&
        (rule.protocol === 'ALL' || rule.protocol === protocol) &&
        (!rule.destIp || rule.destIp === destIP)
    );

    if (blockedRule) {
      addHop(
        currentHopIndex++,
        rName,
        'firewall',
        'Firewall Drop',
        `Packet rejected by Firewall rule on ${rName} (Protocol: ${protocol}).`,
        'error'
      );
      animationSteps.push({ type: 'node', id: currentRouter.id, status: 'dropped' });

      return {
        success: false,
        reason: `Packet dropped by Firewall policy on ${rName}.`,
        solution: `Allow ${protocol} traffic in the Firewall rules of ${rName}.`,
        hops,
        pathNodes,
        pathEdges,
        animationSteps,
        packetInfo: {
          packetId,
          sourceIP,
          destIP,
          protocol,
          ttl: currentTTL,
          packetSize: '64 bytes',
          status: 'Dropped (Firewall Policy)'
        }
      };
    }

    // Forwarding lookup
    const forwardResult = resolveRouterForwarding(currentRouter, destIP);

    if (!forwardResult) {
      addHop(
        currentHopIndex++,
        rName,
        'router',
        'Routing Table Lookup Failed',
        `${rName} has NO route matching destination ${destIP}. ICMP Destination Net Unreachable.`,
        'error'
      );
      animationSteps.push({ type: 'node', id: currentRouter.id, status: 'dropped' });

      return {
        success: false,
        reason: `Destination network unreachable: Router ${rName} has no route to ${destIP}.`,
        solution: `Add a static route on ${rName} for destination network with appropriate Next Hop IP or Default Route (0.0.0.0/0).`,
        hops,
        pathNodes,
        pathEdges,
        animationSteps,
        packetInfo: {
          packetId,
          sourceIP,
          destIP,
          protocol,
          ttl: currentTTL,
          packetSize: '64 bytes',
          status: 'Dropped (No Route)'
        }
      };
    }

    if (forwardResult.type === 'DIRECT') {
      addHop(
        currentHopIndex++,
        rName,
        'router',
        'Direct Subnet Forwarding',
        `${rName} interface ${forwardResult.interface} is directly connected to destination subnet. Forwarding via ARP.`,
        'success'
      );

      // Find L2 path from this router to destination node
      const l2ToDest = findL2Path(graph, currentRouter.id, destNode.id);
      if (!l2ToDest) {
        addHop(
          currentHopIndex++,
          rName,
          'router',
          'Delivery Failure',
          `Cannot deliver packet from ${rName} to ${dName}: link or switch path down.`,
          'error'
        );
        animationSteps.push({ type: 'node', id: currentRouter.id, status: 'dropped' });

        return {
          success: false,
          reason: `Physical path between ${rName} and ${dName} is broken or missing switch.`,
          solution: `Connect ${rName} and ${dName} to the same switch network.`,
          hops,
          pathNodes,
          pathEdges,
          animationSteps,
          packetInfo: {
            packetId,
            sourceIP,
            destIP,
            protocol,
            ttl: currentTTL,
            packetSize: '64 bytes',
            status: 'Dropped'
          }
        };
      }

      // Traverse remaining hops
      for (let i = 0; i < l2ToDest.length - 1; i++) {
        const u = l2ToDest[i];
        const v = l2ToDest[i + 1];
        const edge = graph.getEdge(u, v);
        const vNode = graph.getNode(v);
        const vName = vNode.data?.name || vNode.id;
        const vType = vNode.type || vNode.data?.type || 'switch';

        if (edge) {
          pathEdges.push(edge.id);
          animationSteps.push({ type: 'edge', id: edge.id, source: u, target: v, status: 'success' });
        }
        pathNodes.push(v);
        animationSteps.push({ type: 'node', id: v, status: 'success', label: vName });

        if (vNode.id !== destNode.id) {
          addHop(
            currentHopIndex++,
            vName,
            vType,
            'L2 Switch Forwarding',
            `Switch forwarding frame towards destination host ${dName}.`,
            'success'
          );
        }
      }

      // Reached destination!
      addHop(
        currentHopIndex++,
        dName,
        dType,
        'Packet Delivered',
        `Destination host ${dName} successfully received ${protocol} packet. (TTL: ${currentTTL})`,
        'success'
      );

      return {
        success: true,
        reason: 'Packet delivered successfully across routed networks.',
        hops,
        pathNodes,
        pathEdges,
        animationSteps,
        stats: {
          latency: 18 + Math.floor(Math.random() * 12),
          hopsCount: pathNodes.length,
          ttlRemaining: currentTTL
        },
        packetInfo: {
          packetId,
          sourceIP,
          destIP,
          protocol,
          ttl: currentTTL,
          packetSize: '64 bytes',
          status: 'Delivered'
        }
      };
    }

    // NEXT_HOP forwarding to another router
    const nextHopIP = forwardResult.nextHopIP;
    addHop(
      currentHopIndex++,
      rName,
      'router',
      'Routing Lookup Match',
      `Route match found. Forwarding to Next Hop ${nextHopIP} via interface ${forwardResult.interface}. (TTL: ${currentTTL})`,
      'success'
    );

    // Find router node with nextHopIP
    let nextRouter = null;
    for (const node of nodes) {
      const type = (node.type || node.data?.type || '').toLowerCase();
      if (type === 'router') {
        const ifaces = node.data?.interfaces || [];
        if (ifaces.some(i => i.ip === nextHopIP && i.status !== 'down')) {
          nextRouter = node;
          break;
        }
      }
    }

    if (!nextRouter) {
      addHop(
        currentHopIndex++,
        rName,
        'router',
        'Next Hop Unreachable',
        `No online router found with Next Hop IP ${nextHopIP}.`,
        'error'
      );
      animationSteps.push({ type: 'node', id: currentRouter.id, status: 'dropped' });

      return {
        success: false,
        reason: `Next hop IP ${nextHopIP} is unreachable from ${rName}.`,
        solution: `Check that the adjacent router interface has IP ${nextHopIP} and is connected.`,
        hops,
        pathNodes,
        pathEdges,
        animationSteps,
        packetInfo: {
          packetId,
          sourceIP,
          destIP,
          protocol,
          ttl: currentTTL,
          packetSize: '64 bytes',
          status: 'Dropped'
        }
      };
    }

    // Check for routing loop
    if (visitedRouters.has(nextRouter.id)) {
      addHop(
        currentHopIndex++,
        rName,
        'router',
        'Routing Loop Detected',
        `Packet forwarded back to previously visited router ${nextRouter.data?.name || nextRouter.id}.`,
        'error'
      );
      animationSteps.push({ type: 'node', id: currentRouter.id, status: 'dropped' });

      return {
        success: false,
        reason: `Routing loop detected between ${rName} and ${nextRouter.data?.name || nextRouter.id}.`,
        solution: `Verify routing tables on both routers to avoid circular next-hop destinations.`,
        hops,
        pathNodes,
        pathEdges,
        animationSteps,
        packetInfo: {
          packetId,
          sourceIP,
          destIP,
          protocol,
          ttl: currentTTL,
          packetSize: '64 bytes',
          status: 'Dropped (Routing Loop)'
        }
      };
    }

    // Traverse link to next router
    const l2BetweenRouters = findL2Path(graph, currentRouter.id, nextRouter.id);
    if (!l2BetweenRouters) {
      addHop(
        currentHopIndex++,
        rName,
        'router',
        'Inter-Router Link Down',
        `No link connection found between ${rName} and ${nextRouter.data?.name || nextRouter.id}.`,
        'error'
      );
      animationSteps.push({ type: 'node', id: currentRouter.id, status: 'dropped' });

      return {
        success: false,
        reason: `No link between router ${rName} and next hop router ${nextRouter.data?.name || nextRouter.id}.`,
        solution: `Connect both routers with a cable or configure connected serial/fiber interface.`,
        hops,
        pathNodes,
        pathEdges,
        animationSteps,
        packetInfo: {
          packetId,
          sourceIP,
          destIP,
          protocol,
          ttl: currentTTL,
          packetSize: '64 bytes',
          status: 'Dropped'
        }
      };
    }

    for (let i = 0; i < l2BetweenRouters.length - 1; i++) {
      const u = l2BetweenRouters[i];
      const v = l2BetweenRouters[i + 1];
      const edge = graph.getEdge(u, v);
      const vNode = graph.getNode(v);

      if (edge) {
        pathEdges.push(edge.id);
        animationSteps.push({ type: 'edge', id: edge.id, source: u, target: v, status: 'success' });
      }
      pathNodes.push(v);
      animationSteps.push({ type: 'node', id: v, status: 'success', label: vNode.data?.name || vNode.id });
    }

    currentRouter = nextRouter;
  }

  // Max hops exceeded fallback
  return {
    success: false,
    reason: 'Maximum router hops exceeded (TTL expired).',
    solution: 'Verify network topology and routing convergence.',
    hops,
    pathNodes,
    pathEdges,
    animationSteps,
    packetInfo: {
      packetId,
      sourceIP,
      destIP,
      protocol,
      ttl: 0,
      packetSize: '64 bytes',
      status: 'Dropped'
    }
  };
}

/**
 * Simulates a realistic ICMP Ping session with streaming lines and summary stats
 */
function simulatePing(nodes = [], edges = [], sourceId, destIdOrIP, count = 4) {
  let destNode = null;
  const graph = buildNetworkGraph(nodes, edges);

  if (isValidIPv4(destIdOrIP)) {
    // Find node with this IP
    for (const node of nodes) {
      if (node.data?.ip === destIdOrIP) {
        destNode = node;
        break;
      }
      if ((node.type || node.data?.type) === 'router') {
        const ifaces = node.data?.interfaces || [];
        if (ifaces.some(i => i.ip === destIdOrIP)) {
          destNode = node;
          break;
        }
      }
    }
  } else {
    destNode = graph.getNode(destIdOrIP);
  }

  if (!destNode) {
    return {
      success: false,
      targetIP: destIdOrIP,
      lines: [
        `PING ${destIdOrIP} (${destIdOrIP}): 56 data bytes`,
        `Ping request could not find host ${destIdOrIP}. Please check the name and try again.`
      ],
      stats: { sent: count, received: 0, lost: count, successRate: 0 }
    };
  }

  const simResult = simulatePacket(nodes, edges, sourceId, destNode.id, 'ICMP');
  const targetIP = destNode.data?.ip || destIdOrIP;
  const lines = [
    `PING ${targetIP} (${targetIP}): 56 data bytes`
  ];

  if (!simResult.success) {
    const errorMsg = simResult.reason || 'Destination Host Unreachable';
    for (let i = 1; i <= count; i++) {
      lines.push(`From ${simResult.packetInfo?.sourceIP || 'source'} icmp_seq=${i} ${errorMsg}`);
    }
    lines.push('');
    lines.push(`--- ${targetIP} ping statistics ---`);
    lines.push(`${count} packets transmitted, 0 packets received, 100.0% packet loss`);

    return {
      success: false,
      targetIP,
      lines,
      simResult,
      stats: { sent: count, received: 0, lost: count, successRate: 0, minRtt: 0, avgRtt: 0, maxRtt: 0 }
    };
  }

  // Ping succeeded: generate response lines with slight jitter
  const baseLatency = simResult.stats?.latency || 12;
  const rtts = [];

  for (let i = 1; i <= count; i++) {
    const jitter = (Math.random() * 4 - 2).toFixed(1);
    const rtt = Math.max(1.5, parseFloat((baseLatency + parseFloat(jitter)).toFixed(1)));
    rtts.push(rtt);
    lines.push(`64 bytes from ${targetIP}: icmp_seq=${i} ttl=${simResult.stats?.ttlRemaining || 64} time=${rtt} ms`);
  }

  const minRtt = Math.min(...rtts);
  const maxRtt = Math.max(...rtts);
  const avgRtt = parseFloat((rtts.reduce((a, b) => a + b, 0) / rtts.length).toFixed(1));

  lines.push('');
  lines.push(`--- ${targetIP} ping statistics ---`);
  lines.push(`${count} packets transmitted, ${count} packets received, 0.0% packet loss`);
  lines.push(`round-trip min/avg/max = ${minRtt}/${avgRtt}/${maxRtt} ms`);

  return {
    success: true,
    targetIP,
    lines,
    simResult,
    stats: {
      sent: count,
      received: count,
      lost: 0,
      successRate: 100,
      minRtt,
      avgRtt,
      maxRtt
    }
  };
}

module.exports = {
  simulatePacket,
  simulatePing
};

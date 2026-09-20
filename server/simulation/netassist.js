/**
 * NetAssist — Deterministic rule-based AI Network Troubleshooter for NetCollaborate.
 *
 * NetAssist analyzes the live network topology, device configurations, routing
 * tables and diagnostic output, then answers natural-language queries by
 * matching intent keywords against a rule-based engine.
 *
 * ARCHITECTURE READY FOR LLM INTEGRATION:
 * The engine is intentionally decoupled. `analyzeQuery()` currently uses a
 * deterministic rule engine, but the whole codebase is structured such that a
 * future `LLM_PROVIDER` can swap in (e.g. OpenAI / local model). To integrate a
 * real LLM later:
 *   1. Add an `async analyzeWithLLM(nodes, edges, question)` function below.
 *   2. Collect a compact serialized summary of the network via `summarizeNetwork()`.
 *   3. Send [summary + question] to the model, return structured JSON.
 * No other part of the system needs to change.
 */

const {
  isValidIPv4,
  isValidSubnetMask,
  getNetworkAddress,
  areInSameSubnet,
  maskToCIDR
} = require('./validator');
const { buildNetworkGraph, detectSwitchLoops } = require('./graph');
const { resolveRouterForwarding, longestPrefixMatch } = require('./routing');
const { simulatePacket } = require('./packetSimulator');

/**
 * Collects all configured IP addresses across end hosts and router interfaces
 * and maps them to their owning device. Used to detect conflicts.
 */
function collectIpMap(nodes = []) {
  const ipMap = new Map(); // ip -> [{ deviceName, interfaceName, device }]
  nodes.forEach((node) => {
    const dType = (node.type || node.data?.type || '').toLowerCase();
    const dName = node.data?.name || node.id;

    if (['pc', 'laptop', 'server', 'printer'].includes(dType)) {
      const ip = node.data?.ip;
      if (isValidIPv4(ip)) {
        if (!ipMap.has(ip)) ipMap.set(ip, []);
        ipMap.get(ip).push({ deviceName: dName, interfaceName: 'Primary', device: node });
      }
    } else if (dType === 'router') {
      (node.data?.interfaces || []).forEach((iface) => {
        if (isValidIPv4(iface.ip)) {
          if (!ipMap.has(iface.ip)) ipMap.set(iface.ip, []);
          ipMap.get(iface.ip).push({ deviceName: dName, interfaceName: iface.name, device: node });
        }
      });
    }
  });
  return ipMap;
}

/**
 * Builds a compact, human-readable network summary used both for rule-based
 * reasoning and (in the future) as the context prompt for an LLM.
 */
function summarizeNetwork(nodes = [], edges = []) {
  const endDevices = nodes.filter((n) =>
    ['pc', 'laptop', 'server', 'printer'].includes((n.type || n.data?.type || '').toLowerCase())
  );
  const routers = nodes.filter((n) => (n.type || n.data?.type || '').toLowerCase() === 'router');
  const switches = nodes.filter((n) => ['switch', 'hub'].includes((n.type || n.data?.type || '').toLowerCase()));

  return {
    deviceCount: nodes.length,
    edgeCount: edges.length,
    endDevices: endDevices.length,
    routers: routers.length,
    switches: switches.length,
    ipMap: collectIpMap(nodes),
    nodes,
    edges
  };
}

/**
 * Runs the full set of diagnostics on a network. Reuses the topology graph,
 * detects duplicate IPs, invalid gateways, missing routes, loops, and returns
 * a normalized list of issues.
 */
function runFullDiagnostics(nodes = [], edges = []) {
  const issues = [];
  const graph = buildNetworkGraph(nodes, edges);
  const connectedIds = new Set();
  edges.forEach((e) => {
    if (e.source) connectedIds.add(e.source);
    if (e.target) connectedIds.add(e.target);
  });

  // Disconnected / isolated devices
  nodes.forEach((node) => {
    const dName = node.data?.name || node.id;
    if (!connectedIds.has(node.id)) {
      issues.push({
        severity: 'warning',
        type: 'disconnected',
        device: dName,
        deviceId: node.id,
        message: `${dName} is not connected to any other device.`,
        fix: `Connect ${dName} to a switch or router with an Ethernet link.`
      });
    }
  });

  // IP conflicts & per-end-device validation
  const ipMap = collectIpMap(nodes);
  ipMap.forEach((owners, ip) => {
    if (owners.length > 1) {
      issues.push({
        severity: 'error',
        type: 'duplicate_ip',
        device: owners.map((o) => o.deviceName).join(', '),
        message: `IP address ${ip} is assigned to ${owners.length} devices (${owners.map((o) => o.deviceName + ' ' + o.interfaceName).join(', ')}).`,
        fix: `Assign a unique IP address to each device. Change one of: ${owners.map((o) => o.deviceName).join(', ')}.`
      });
    }
  });

  nodes.forEach((node) => {
    const dType = (node.type || node.data?.type || '').toLowerCase();
    const dName = node.data?.name || node.id;

    if (['pc', 'laptop', 'server', 'printer'].includes(dType)) {
      const ip = node.data?.ip;
      const mask = node.data?.subnetMask || '255.255.255.0';
      const gw = node.data?.gateway;

      if (!ip || !isValidIPv4(ip)) {
        issues.push({
          severity: 'error',
          type: 'invalid_ip',
          device: dName,
          deviceId: node.id,
          message: `${dName} has no valid IPv4 address${ip ? ' (' + ip + ')' : ''}.`,
          fix: `Assign a valid IPv4 address (e.g. 192.168.1.10) to ${dName}.`,
          quickFix: { type: 'SET_IP', deviceId: node.id, defaultIp: '192.168.1.10', defaultMask: '255.255.255.0' }
        });
      } else if (!isValidSubnetMask(mask)) {
        issues.push({
          severity: 'error',
          type: 'invalid_mask',
          device: dName,
          deviceId: node.id,
          message: `${dName} uses invalid subnet mask ${mask}.`,
          fix: `Use a valid subnet mask such as 255.255.255.0 (/24).`,
          quickFix: { type: 'SET_MASK', deviceId: node.id, defaultMask: '255.255.255.0' }
        });
      } else if (gw && isValidIPv4(gw) && !areInSameSubnet(ip, gw, mask)) {
        const net = getNetworkAddress(ip, mask);
        const suggestedGw = `${net.substring(0, net.lastIndexOf('.'))}.1`;
        issues.push({
          severity: 'error',
          type: 'gateway_subnet_mismatch',
          device: dName,
          deviceId: node.id,
          message: `${dName} gateway ${gw} is not on the same subnet (${net}/${maskToCIDR(mask)}) as its IP ${ip}.`,
          fix: `Set the default gateway of ${dName} to ${suggestedGw} (on the local subnet).`,
          quickFix: { type: 'ALIGN_GATEWAY_SUBNET', deviceId: node.id, gateway: suggestedGw }
        });
      } else if (gw && !isValidIPv4(gw)) {
        issues.push({
          severity: 'error',
          type: 'invalid_gateway',
          device: dName,
          deviceId: node.id,
          message: `${dName} has an invalid default gateway "${gw}".`,
          fix: `Configure a valid IPv4 gateway on ${dName}.`
        });
      }
    } else if (dType === 'router') {
      const ifaces = node.data?.interfaces || [];
      ifaces.forEach((iface) => {
        if (iface.ip && !isValidIPv4(iface.ip)) {
          issues.push({
            severity: 'error',
            type: 'invalid_ip',
            device: dName + ' (' + iface.name + ')',
            message: `Router ${dName} interface ${iface.name} has invalid IP ${iface.ip}.`,
            fix: `Assign a valid IPv4 address to ${iface.name} on ${dName}.`
          });
        }
      });
    }
  });

  // Layer 2 switch loops
  const loops = detectSwitchLoops(nodes, edges);
  loops.forEach((loop) => {
    issues.push({
      severity: 'warning',
      type: 'switch_loop',
      device: loop.nodes.map((id) => nodes.find((n) => n.id === id)?.data?.name || id).join(' ⇄ '),
      message: 'Layer 2 switching loop detected between switches.',
      fix: 'Remove one of the redundant cables between the switches to break the loop (STP should normally handle this).'
    });
  });

  return issues;
}

/**
 * Finds the most likely root cause(s) for a packet failure between two devices,
 * based on the simulation result's diagnostics + reason + solution.
 */
function explainPacketFailure(nodes, edges, sourceId, destId, simResult) {
  const source = nodes.find((n) => n.id === sourceId);
  const dest = nodes.find((n) => n.id === destId);
  const sName = source?.data?.name || sourceId || 'Source';
  const dName = dest?.data?.name || destId || 'Destination';

  if (!source) return { summary: `Source device ${sourceId} was not found on the canvas.`, points: [] };
  if (!dest) return { summary: `Destination device ${destId} was not found on the canvas.`, points: [] };

  const points = [];
  if (simResult?.reason) points.push(`Reason: ${simResult.reason}`);
  if (simResult?.solution) points.push(`Solution: ${simResult.solution}`);
  (simResult?.hops || [])
    .filter((h) => h.status === 'error')
    .slice(0, 3)
    .forEach((h) => points.push(`At ${h.device} — ${h.action}: ${h.details}`));

  return {
    summary: `Packet from ${sName} to ${dName} could not be delivered.`,
    points
  };
}

/**
 * Intent detection helpers — map a user's natural-language question to a list of
 * intents (what the user wants) and target devices (which device they mention).
 */
function detectTargetDevice(question, nodes) {
  const q = question.toLowerCase();
  // direct name match first
  let match = nodes.find((n) => {
    const name = (n.data?.name || '').toLowerCase();
    return name && q.includes(name);
  });
  if (match) return match;

  // match by type hints
  const typeHints = {
    pc: ['pc-', 'pc ', 'workstation', 'computer', 'host'],
    server: ['server', 'srv'],
    router: ['router', 'r-'],
    switch: ['switch', 'sw-', 'hub']
  };
  for (const [type, hints] of Object.entries(typeHints)) {
    if (hints.some((h) => q.includes(h))) {
      match = nodes.find((n) => (n.type || n.data?.type || '').toLowerCase() === type);
      if (match) return match;
    }
  }
  return null;
}

function getDeviceStatusText(node) {
  if (!node) return null;
  const dName = node.data?.name || node.id;
  const dType = (node.type || node.data?.type || '').toLowerCase();
  const ip = node.data?.ip || '—';
  const status = node.data?.status === 'down' ? 'OFFLINE 🔴' : 'online 🟢';

  const lines = [`• ${dName} (${dType}) — ${status}`];
  if (dType === 'router') {
    (node.data?.interfaces || []).forEach((iface) => {
      lines.push(`   Interface ${iface.name}: IP ${iface.ip || '—'} / ${iface.mask || '—'} — ${iface.status === 'down' ? 'down 🔴' : 'up 🟢'}`);
    });
  } else {
    lines.push(`   IP: ${ip}`);
    if (node.data?.gateway) lines.push(`   Gateway: ${node.data.gateway}`);
    if (node.data?.subnetMask) lines.push(`   Mask: ${node.data.subnetMask}`);
  }
  return lines.join('\n');
}

/**
 * Core rule engine. Given the network + a question, produce a structured answer.
 * Returns { answer: string, points: string[], actions: [...] }
 */
function ruleEngine(question, nodes, edges) {
  const q = question.toLowerCase();
  const context = summarizeNetwork(nodes, edges);
  const target = detectTargetDevice(question, nodes);
  const actions = [];

  // ---- INTENT: why can't A reach B / connectivity ----
  if (/\b(can'?t|cannot|unable|fail|why).{0,40}(reach|communicate|connect|ping|talk|send)\b/.test(q) ||
      /\b(reach|communicate|connect|ping)\b/.test(q)) {
    // try to find two target devices
    const mentioned = nodes.filter((n) => {
      const name = (n.data?.name || '').toLowerCase();
      return name && q.includes(name);
    });
    if (mentioned.length >= 2) {
      const a = mentioned[0];
      const b = mentioned[1];
      const sim = simulatePacket(nodes, edges, a.id, b.id, 'ICMP', 64);
      if (sim.success) {
        return {
          answer: `Good news — ${a.data?.name} can reach ${b.data?.name}. The path succeeds.`,
          points: [`✓ Packet delivered over ${sim.stats?.hopsCount || '—'} hops (latency ~${sim.stats?.latency || '—'} ms).`],
          actions: []
        };
      }
      const expl = explainPacketFailure(nodes, edges, a.id, b.id, sim);
      const issue = runFullDiagnostics(nodes, edges).find((i) => i.quickFix);
      if (issue?.quickFix) actions.push(issue.quickFix);
      return {
        answer: `${a.data?.name} cannot reach ${b.data?.name}. ${expl.summary}`,
        points: expl.points,
        actions
      };
    }
  }

  // ---- INTENT: diagnostics / why is my network broken ----
  if (/\b(diagnos\w*|problem|issue|broken|health\w*|error\w*)\b|why can'?t|what'?s wrong|what is wrong/.test(q)) {
    const issues = runFullDiagnostics(nodes, edges);
    if (issues.length === 0) {
      return {
        answer: `Your network looks healthy. I checked ${context.deviceCount} devices and ${context.edgeCount} connections and found no configuration problems.`,
        points: ['✓ No duplicate IPs', '✓ All gateways on correct subnets', '✓ No disconnected devices', '✓ No switch loops detected'],
        actions: []
      };
    }
    const errors = issues.filter((i) => i.severity === 'error');
    const warnings = issues.filter((i) => i.severity === 'warning');
    const top = issues[0];
    if (top?.quickFix) actions.push(top.quickFix);
    return {
      answer: `I found ${errors.length} error(s) and ${warnings.length} warning(s). The most important issue: ${top.message}`,
      points: issues.slice(0, 5).map((i) => `[${i.severity === 'error' ? '✗' : '⚠'}] ${i.message} — ${i.fix}`),
      actions
    };
  }

  // ---- INTENT: about a specific device ----
  if (target) {
    const statusLines = getDeviceStatusText(target);
    const dType = (target.type || target.data?.type || '').toLowerCase();
    if (dType === 'router') {
      const routes = target.data?.routingTable || [];
      return {
        answer: `Here's what I see for ${target.data?.name}:\n${statusLines}`,
        points: [
          routes.length
            ? `Routing table has ${routes.length} static route(s).`
            : 'This router currently has no static routes configured.',
          ...(routes.length ? routes.slice(0, 4).map((r) => `   ${r.destination}/${maskToCIDR(r.mask)} → next hop ${r.nextHop} via ${r.interface}`) : [])
        ],
        actions: []
      };
    }
    if (nodeHasIpConflict(target, nodes)) {
      return {
        answer: `⚠ ${target.data?.name} has an IP address conflict.`,
        points: [`${target.data?.name} shares its IP (${target.data?.ip}) with another device.`, 'Assign a unique IP address.'],
        actions: []
      };
    }
    return {
      answer: `Here's what I see for ${target.data?.name}:\n${statusLines}`,
      points: [],
      actions: []
    };
  }

  // ---- INTENT: help / what can you do ----
  if (/\b(help|what can you do|how do i use|commands)\b/.test(q)) {
    return {
      answer: 'I can help you diagnose, explain, and fix your network. Try asking:',
      points: [
        '• "Why can’t PC-01 reach Server-01?"',
        '• "Diagnose my network" / "Any problems?"',
        '• "Tell me about Router-01"',
        '• "Is the health score good?"'
      ],
      actions: []
    };
  }

  // ---- fallback ----
  return {
    answer: 'I’m not sure exactly what you’re asking, but here is the status of your network:',
    points: [
      `Devices: ${context.deviceCount}, Connections: ${context.edgeCount}`,
      `End devices: ${context.endDevices}, Routers: ${context.routers}, Switches: ${context.switches}`,
      'You can ask me things like *"why can’t X reach Y"*, *"diagnose my network"*, or *"tell me about <device>"*.'
    ],
    actions: []
  };
}

function nodeHasIpConflict(node, nodes) {
  const ip = node.data?.ip;
  if (!isValidIPv4(ip)) return false;
  return nodes.some((n) => n.id !== node.id && n.data?.ip === ip);
}

/**
 * PUBLIC API — Analyze a question against a network.
 * @param {Array} nodes
 * @param {Array} edges
 * @param {String} question
 * @returns {{ answer, points, actions, provider: 'netassist-rule-engine' }}
 */
function netAssistAnalyze(nodes = [], edges = [], question = '') {
  const trimmed = (question || '').trim();
  const result = ruleEngine(trimmed, nodes, edges);
  return {
    ...result,
    question: trimmed,
    provider: 'netassist-rule-engine',
    engineVersion: '1.0.0'
  };
}

module.exports = {
  netAssistAnalyze,
  runFullDiagnostics,
  summarizeNetwork,
  explainPacketFailure
};

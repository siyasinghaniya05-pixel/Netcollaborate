/**
 * Instructor Engine for NetCollaborate
 * Pure functions: evaluation of lab submissions, automated assignment rubrics,
 * and class performance aggregation.
 */

const { validateTopology } = require('./validator');
const { simulatePacket } = require('./packetSimulator');
const { generateLabReport } = require('./reportGenerator');

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Built-in Assignment Catalog
const ASSIGNMENTS = [
  {
    id: 'lab-1',
    title: 'Lab 1: IP Addressing & Subnetting Basics',
    description: 'Design a two-workstation LAN connected to a switch and router with valid Class C private addressing (192.168.1.0/24).',
    requiredDevices: { pc: 2, switch: 1, router: 1 },
    maxScore: 100,
    rules: [
      { id: 'min_devices', description: 'Network contains at least 2 PCs, 1 Switch, and 1 Router', weight: 20 },
      { id: 'valid_ips', description: 'All endpoints have valid IPv4 addresses and /24 subnet masks', weight: 30 },
      { id: 'gateway_set', description: 'Default gateways correctly set to router interface IP', weight: 25 },
      { id: 'no_conflicts', description: 'Zero IP address collisions or duplicate IPs', weight: 25 }
    ]
  },
  {
    id: 'lab-2',
    title: 'Lab 2: Multi-Subnet Routing & Gateway Configuration',
    description: 'Interconnect two subnets (192.168.1.0/24 and 192.168.2.0/24) via core routers with static routing entries.',
    requiredDevices: { router: 2, switch: 2, server: 1, pc: 2 },
    maxScore: 100,
    rules: [
      { id: 'subnets_count', description: 'At least two distinct subnets configured', weight: 25 },
      { id: 'routing_tables', description: 'Routers contain valid static route table entries for remote subnets', weight: 30 },
      { id: 'ping_reachability', description: 'Workstations can reach the remote server across routers', weight: 30 },
      { id: 'zero_loops', description: 'Zero Layer 2 loops or switching loops detected', weight: 15 }
    ]
  },
  {
    id: 'lab-3',
    title: 'Lab 3: Enterprise DMZ & Server Hardening',
    description: 'Segment corporate workstations and public web servers using appropriate subnet boundaries and gateway rules.',
    requiredDevices: { router: 1, switch: 2, server: 2, pc: 2 },
    maxScore: 100,
    rules: [
      { id: 'dmz_isolation', description: 'Web servers reside in a dedicated DMZ subnet', weight: 30 },
      { id: 'server_gateway', description: 'Servers configured with dedicated gateways', weight: 30 },
      { id: 'diagnostics_clean', description: 'Health score at or above 90%', weight: 40 }
    ]
  }
];

/**
 * Evaluates a student network submission against an assignment
 * @param {Array} nodes
 * @param {Array} edges
 * @param {string} assignmentId
 * @returns {Object} Evaluation report { score, criteriaResults, passed, feedback }
 */
function evaluateAssignment(nodes = [], edges = [], assignmentId = 'lab-1') {
  const clonedNodes = deepClone(nodes);
  const clonedEdges = deepClone(edges);
  const assignment = ASSIGNMENTS.find(a => a.id === assignmentId) || ASSIGNMENTS[0];

  const diagnostics = validateTopology(clonedNodes, clonedEdges);
  const criteriaResults = [];
  let earnedScore = 0;

  assignment.rules.forEach(rule => {
    let pass = false;
    let details = '';

    switch (rule.id) {
      case 'min_devices': {
        const counts = {};
        clonedNodes.forEach(n => {
          const t = n.type || n.data?.type;
          counts[t] = (counts[t] || 0) + 1;
        });
        const req = assignment.requiredDevices || {};
        const meetsReq = Object.entries(req).every(([type, count]) => (counts[type] || 0) >= count);
        pass = meetsReq;
        details = pass
          ? 'Required device inventory satisfied.'
          : `Missing devices. Current inventory: ${JSON.stringify(counts)}`;
        break;
      }
      case 'valid_ips': {
        const unconfigured = clonedNodes.filter(n => {
          const d = n.data || {};
          return ['pc', 'server'].includes(n.type || d.type) && (!d.ip || !d.subnetMask);
        });
        pass = unconfigured.length === 0;
        details = pass
          ? 'All endpoints have valid IP configurations.'
          : `${unconfigured.length} device(s) lack IP or subnet mask.`;
        break;
      }
      case 'gateway_set': {
        const missingGateway = clonedNodes.filter(n => {
          const d = n.data || {};
          return ['pc', 'server'].includes(n.type || d.type) && !d.gateway;
        });
        pass = missingGateway.length === 0;
        details = pass ? 'All client devices have default gateways.' : `${missingGateway.length} device(s) have missing gateways.`;
        break;
      }
      case 'no_conflicts': {
        const ipErrors = (diagnostics.errors || []).filter(e => e.type === 'IP_CONFLICT');
        pass = ipErrors.length === 0;
        details = pass ? 'Zero IP address collisions.' : `${ipErrors.length} IP conflict(s) detected.`;
        break;
      }
      case 'subnets_count': {
        const subnets = new Set();
        clonedNodes.forEach(n => {
          const ip = n.data?.ip;
          if (ip && typeof ip === 'string') {
            const parts = ip.split('.');
            if (parts.length === 4) subnets.add(`${parts[0]}.${parts[1]}.${parts[2]}.0`);
          }
        });
        pass = subnets.size >= 2;
        details = pass ? `Found ${subnets.size} distinct subnets.` : `Only ${subnets.size} subnet found; at least 2 required.`;
        break;
      }
      case 'routing_tables': {
        const routers = clonedNodes.filter(n => (n.type || n.data?.type) === 'router');
        const hasRoutes = routers.some(r => (r.data?.routingTable || []).length > 0);
        pass = hasRoutes;
        details = pass ? 'Routers have active static routes configured.' : 'No routing table entries discovered on routers.';
        break;
      }
      case 'ping_reachability': {
        // Attempt packet simulation from first PC to last Server if available
        const pc = clonedNodes.find(n => (n.type || n.data?.type) === 'pc');
        const srv = clonedNodes.find(n => (n.type || n.data?.type) === 'server');
        if (pc && srv) {
          try {
            const sim = simulatePacket(clonedNodes, clonedEdges, pc.id, srv.id, 'ICMP');
            pass = Boolean(sim.success);
            details = pass ? `Packet delivered successfully: ${pc.data?.name} -> ${srv.data?.name}` : `Ping dropped: ${sim.reason || 'Unreachable'}`;
          } catch (e) {
            pass = false;
            details = 'Simulation encountered route resolution error.';
          }
        } else {
          pass = clonedNodes.length >= 4 && clonedEdges.length >= 3;
          details = pass ? 'Topology interconnected.' : 'Insufficient endpoints for end-to-end test.';
        }
        break;
      }
      case 'zero_loops': {
        const loopErrors = (diagnostics.errors || []).filter(e => e.type === 'SWITCH_LOOP');
        pass = loopErrors.length === 0;
        details = pass ? 'Loop-free Layer 2 switching.' : 'Switching loop detected in topology.';
        break;
      }
      case 'dmz_isolation':
      case 'server_gateway': {
        const servers = clonedNodes.filter(n => (n.type || n.data?.type) === 'server');
        pass = servers.length > 0 && servers.every(s => s.data?.gateway);
        details = pass ? 'Servers configured with dedicated gateway.' : 'Server missing gateway or not isolated.';
        break;
      }
      case 'diagnostics_clean': {
        pass = diagnostics.healthScore >= 90;
        details = `Health score: ${diagnostics.healthScore}%.`;
        break;
      }
      default:
        pass = true;
        details = 'Requirement verified.';
    }

    const awarded = pass ? rule.weight : 0;
    earnedScore += awarded;
    criteriaResults.push({
      ruleId: rule.id,
      description: rule.description,
      weight: rule.weight,
      awarded,
      passed: pass,
      details
    });
  });

  return {
    assignmentId: assignment.id,
    assignmentTitle: assignment.title,
    maxScore: assignment.maxScore,
    earnedScore,
    percentage: earnedScore,
    passed: earnedScore >= 70,
    healthScore: diagnostics.healthScore,
    criteriaResults,
    evaluatedAt: new Date().toISOString()
  };
}

/**
 * Returns mock sample student submissions for rich out-of-the-box instructor dashboard experience
 */
function getSampleSubmissions() {
  return [
    {
      id: 'sub-001',
      studentName: 'Maya Patel',
      studentId: 'STU-202488',
      email: 'maya.patel@university.edu',
      assignmentId: 'lab-2',
      assignmentTitle: 'Lab 2: Multi-Subnet Routing & Gateway Configuration',
      status: 'Graded',
      submittedAt: '2026-09-16T14:30:00Z',
      healthScore: 98,
      score: 95,
      letterGrade: 'A',
      networkName: "Maya's Enterprise Topology",
      deviceCount: 7,
      linkCount: 6,
      feedback: 'Excellent dual-router configuration with proper next-hop routing tables.',
      networkData: null
    },
    {
      id: 'sub-002',
      studentName: 'Marcus Vance',
      studentId: 'STU-202512',
      email: 'm.vance@university.edu',
      assignmentId: 'lab-2',
      assignmentTitle: 'Lab 2: Multi-Subnet Routing & Gateway Configuration',
      status: 'Graded',
      submittedAt: '2026-09-16T18:15:00Z',
      healthScore: 88,
      score: 85,
      letterGrade: 'B',
      networkName: 'Marcus Routing Lab',
      deviceCount: 6,
      linkCount: 5,
      feedback: 'Good work! Server DNS resolution could be optimized to 8.8.8.8.',
      networkData: null
    },
    {
      id: 'sub-003',
      studentName: 'Elena Rostova',
      studentId: 'STU-202604',
      email: 'e.rostova@university.edu',
      assignmentId: 'lab-1',
      assignmentTitle: 'Lab 1: IP Addressing & Subnetting Basics',
      status: 'Submitted',
      submittedAt: '2026-09-17T09:40:00Z',
      healthScore: 94,
      score: 92,
      letterGrade: 'A',
      networkName: 'Elena Lab 1 Workspace',
      deviceCount: 5,
      linkCount: 4,
      feedback: 'Awaiting instructor review.',
      networkData: null
    },
    {
      id: 'sub-004',
      studentName: 'Devon Clarke',
      studentId: 'STU-202391',
      email: 'd.clarke@university.edu',
      assignmentId: 'lab-2',
      assignmentTitle: 'Lab 2: Multi-Subnet Routing & Gateway Configuration',
      status: 'Needs Review',
      submittedAt: '2026-09-17T11:20:00Z',
      healthScore: 64,
      score: 65,
      letterGrade: 'D',
      networkName: 'Devon Final Network',
      deviceCount: 6,
      linkCount: 5,
      feedback: 'Workstation 2 has gateway set to 192.168.1.254 instead of Router interface 192.168.1.1.',
      networkData: null
    },
    {
      id: 'sub-005',
      studentName: 'Liam Chen',
      studentId: 'STU-202744',
      email: 'liam.c@university.edu',
      assignmentId: 'lab-1',
      assignmentTitle: 'Lab 1: IP Addressing & Subnetting Basics',
      status: 'Graded',
      submittedAt: '2026-09-17T12:05:00Z',
      healthScore: 100,
      score: 100,
      letterGrade: 'A+',
      networkName: 'Liam Subnetting Clean',
      deviceCount: 4,
      linkCount: 3,
      feedback: 'Flawless design and IP allocation.',
      networkData: null
    }
  ];
}

/**
 * Aggregates overall class metrics
 * @param {Array} submissions
 * @returns {Object} Class KPIs
 */
function aggregateClassMetrics(submissions = []) {
  if (submissions.length === 0) {
    return {
      totalSubmissions: 0,
      averageScore: 0,
      averageHealth: 0,
      gradedCount: 0,
      needsReviewCount: 0,
      passingRate: 0
    };
  }

  const total = submissions.length;
  const totalScore = submissions.reduce((acc, s) => acc + (s.score || 0), 0);
  const totalHealth = submissions.reduce((acc, s) => acc + (s.healthScore || 0), 0);
  const passingCount = submissions.filter(s => (s.score || 0) >= 70).length;
  const gradedCount = submissions.filter(s => s.status === 'Graded').length;
  const needsReviewCount = submissions.filter(s => s.status === 'Needs Review' || s.status === 'Submitted').length;

  return {
    totalSubmissions: total,
    averageScore: Math.round(totalScore / total),
    averageHealth: Math.round(totalHealth / total),
    gradedCount,
    needsReviewCount,
    passingRate: Math.round((passingCount / total) * 100)
  };
}

module.exports = {
  ASSIGNMENTS,
  evaluateAssignment,
  getSampleSubmissions,
  aggregateClassMetrics
};

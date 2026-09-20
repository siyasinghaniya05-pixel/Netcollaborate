/**
 * Automatic Lab Report Generator Engine for NetCollaborate
 * Pure function: (network, options) -> Report Data Object
 * Compiles comprehensive documentation, inventories, diagnostics, test logs,
 * and automated rubric scoring.
 */

const { validateTopology } = require('./validator');

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Evaluates an automated lab rubric based on network configuration
 * @param {Array} nodes
 * @param {Array} edges
 * @param {Object} diagnostics
 * @param {Array} simHistory
 * @returns {Object} Rubric score & criteria breakdown
 */
function evaluateLabRubric(nodes = [], edges = [], diagnostics = {}, simHistory = []) {
  const criteria = [];
  let totalScore = 0;

  // Criterion 1: Device Addressing & Configuration (Max 30)
  const configuredNodes = nodes.filter(n => {
    const d = n.data || {};
    return d.ip && d.subnetMask;
  });
  const addressingRate = nodes.length > 0 ? (configuredNodes.length / nodes.length) : 0;
  const addressingScore = Math.round(addressingRate * 30);
  criteria.push({
    category: 'IP Addressing & Subnetting',
    maxScore: 30,
    awardedScore: addressingScore,
    status: addressingScore >= 25 ? 'Exemplary' : addressingScore >= 18 ? 'Satisfactory' : 'Needs Improvement',
    notes: `${configuredNodes.length} of ${nodes.length} devices have complete IP/Subnet configurations.`
  });
  totalScore += addressingScore;

  // Criterion 2: Topology Structure & Connectivity (Max 25)
  const connectedNodes = new Set();
  edges.forEach(e => {
    connectedNodes.add(e.source);
    connectedNodes.add(e.target);
  });
  const connectionRate = nodes.length > 0 ? (connectedNodes.size / nodes.length) : 0;
  const topologyScore = Math.round(connectionRate * 25);
  criteria.push({
    category: 'Topology & Cabling',
    maxScore: 25,
    awardedScore: topologyScore,
    status: topologyScore >= 22 ? 'Exemplary' : topologyScore >= 15 ? 'Satisfactory' : 'Incomplete',
    notes: `${connectedNodes.size} of ${nodes.length} devices connected via active physical links.`
  });
  totalScore += topologyScore;

  // Criterion 3: Network Diagnostics & Conflict Freedom (Max 25)
  const errorCount = (diagnostics.errors || []).length;
  const warningCount = (diagnostics.warnings || []).length;
  let diagScore = 25 - (errorCount * 8) - (warningCount * 3);
  if (diagScore < 0) diagScore = 0;
  criteria.push({
    category: 'Diagnostics & Hygiene',
    maxScore: 25,
    awardedScore: diagScore,
    status: errorCount === 0 && warningCount === 0 ? 'Exemplary' : errorCount === 0 ? 'Acceptable' : 'Deficient',
    notes: `${errorCount} critical error(s) and ${warningCount} warning(s) detected.`
  });
  totalScore += diagScore;

  // Criterion 4: Verification & Traffic Transmission (Max 20)
  const successfulPackets = simHistory.filter(h => h.status === 'Delivered').length;
  const attemptedPackets = simHistory.length;
  let trafficScore = 0;
  if (attemptedPackets > 0) {
    trafficScore = Math.round((successfulPackets / attemptedPackets) * 20);
  } else {
    // If no simulations logged yet, grant partial credit if health is high
    trafficScore = diagnostics.healthScore >= 90 ? 16 : 10;
  }
  criteria.push({
    category: 'Traffic Verification',
    maxScore: 20,
    awardedScore: trafficScore,
    status: trafficScore >= 16 ? 'Verified' : 'Unverified',
    notes: attemptedPackets > 0
      ? `${successfulPackets} of ${attemptedPackets} simulated packet(s) successfully delivered.`
      : 'Automated baseline check passed.'
  });
  totalScore += trafficScore;

  // Determine Letter Grade
  let letterGrade = 'F';
  if (totalScore >= 90) letterGrade = 'A';
  else if (totalScore >= 80) letterGrade = 'B';
  else if (totalScore >= 70) letterGrade = 'C';
  else if (totalScore >= 60) letterGrade = 'D';

  return {
    totalScore,
    maxPossible: 100,
    percentage: totalScore,
    letterGrade,
    criteria
  };
}

/**
 * Generates structured Lab Report data
 * @param {Object} network Full network object { name, nodes, edges, roomId, simulationHistory, healthScore }
 * @param {Object} options Metadata { studentName, studentId, courseName, labTitle, instructorComments, gradeOverride }
 * @returns {Object} Complete Lab Report payload
 */
function generateLabReport(network = {}, options = {}) {
  const nodes = deepClone(network.nodes || []);
  const edges = deepClone(network.edges || []);
  const simHistory = deepClone(network.simulationHistory || []);

  const diagnostics = validateTopology(nodes, edges);

  // Compile Device Inventory
  const deviceInventory = nodes.map((node, index) => {
    const d = node.data || {};
    return {
      index: index + 1,
      id: node.id,
      name: d.name || node.id,
      type: node.type || d.type || 'device',
      ip: d.ip || 'Unconfigured',
      subnetMask: d.subnetMask || 'N/A',
      gateway: d.gateway || 'N/A',
      dns: d.dns || 'N/A',
      mac: d.mac || 'N/A',
      vlan: d.vlan || 'Default (1)',
      status: d.status || 'up'
    };
  });

  // Extract Router Routing Tables
  const routingTables = [];
  nodes
    .filter(n => (n.type || n.data?.type) === 'router')
    .forEach(router => {
      const d = router.data || {};
      const routes = (d.routingTable || []).map((r, i) => ({
        index: i + 1,
        destination: r.destination || '0.0.0.0',
        mask: r.mask || '0.0.0.0',
        nextHop: r.nextHop || 'Direct',
        interface: r.interface || 'G0/0',
        metric: r.metric ?? 1
      }));
      const interfaces = (d.interfaces || []).map(intf => ({
        name: intf.name,
        ip: intf.ip,
        mask: intf.mask,
        status: intf.status || 'up'
      }));

      routingTables.push({
        routerId: router.id,
        routerName: d.name || router.id,
        interfaces,
        routes
      });
    });

  // Switch Port & Trunk mappings
  const switchPortMaps = [];
  nodes
    .filter(n => ['switch', 'hub'].includes(n.type || n.data?.type))
    .forEach(sw => {
      const d = sw.data || {};
      const connectedEdges = edges.filter(e => e.source === sw.id || e.target === sw.id);
      const portAllocations = (d.ports || []).map(p => ({
        number: p.number,
        connectedTo: p.connectedTo || 'Vacant',
        vlan: p.vlan || '1',
        status: p.status || 'up'
      }));

      switchPortMaps.push({
        switchId: sw.id,
        switchName: d.name || sw.id,
        totalLinks: connectedEdges.length,
        ports: portAllocations
      });
    });

  // Run automated rubric
  const rubric = evaluateLabRubric(nodes, edges, diagnostics, simHistory);

  // Build report summary
  const subnetsDetected = new Set();
  nodes.forEach(n => {
    const ip = n.data?.ip;
    if (ip && typeof ip === 'string') {
      const parts = ip.split('.');
      if (parts.length === 4) {
        subnetsDetected.add(`${parts[0]}.${parts[1]}.${parts[2]}.0`);
      }
    }
  });

  return {
    reportId: `REP-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    generatedAt: new Date().toISOString(),
    metadata: {
      labTitle: options.labTitle || 'Networking Lab & Topology Verification Report',
      courseName: options.courseName || 'Computer Networks (CS401 / NET201)',
      studentName: options.studentName || 'Student Engineer',
      studentId: options.studentId || 'STU-' + Math.floor(100000 + Math.random() * 900000),
      instructorName: options.instructorName || 'Course Instructor',
      networkName: network.name || 'Untitled Network Lab',
      roomId: network.roomId || 'N/A'
    },
    executiveSummary: {
      totalDevices: nodes.length,
      totalLinks: edges.length,
      subnetsCount: subnetsDetected.size,
      subnetsList: Array.from(subnetsDetected),
      healthScore: diagnostics.healthScore,
      healthRating: diagnostics.summary?.healthRating || 'Good',
      verificationStatus: rubric.percentage >= 70 ? 'PASSED' : 'ACTION REQUIRED',
      finalScore: options.gradeOverride !== undefined ? options.gradeOverride : rubric.totalScore,
      letterGrade: options.letterGradeOverride || rubric.letterGrade
    },
    rubricEvaluation: rubric,
    deviceInventory,
    routingTables,
    switchPortMaps,
    diagnosticsSummary: {
      errors: diagnostics.errors || [],
      warnings: diagnostics.warnings || [],
      validCount: diagnostics.validCount || 0
    },
    simulationHistory: simHistory.slice(0, 15),
    instructorFeedback: {
      comments: options.instructorComments || 'Automated evaluation completed. Topology adheres to baseline design specifications.',
      gradedAt: new Date().toISOString()
    }
  };
}

module.exports = {
  generateLabReport,
  evaluateLabRubric
};

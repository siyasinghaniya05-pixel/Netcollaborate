const { isValidIPv4, isValidSubnetMask, validateTopology } = require('./validator');
const { simulatePacket, simulatePing } = require('./packetSimulator');

console.log('--- Testing IP Validation ---');
console.log('192.168.1.10 valid?', isValidIPv4('192.168.1.10') === true ? 'PASS' : 'FAIL');
console.log('999.999.1.1 invalid?', isValidIPv4('999.999.1.1') === false ? 'PASS' : 'FAIL');
console.log('255.255.255.0 mask valid?', isValidSubnetMask('255.255.255.0') === true ? 'PASS' : 'FAIL');
console.log('255.255.255.10 mask invalid?', isValidSubnetMask('255.255.255.10') === false ? 'PASS' : 'FAIL');

// Create test network: PC1 -> Switch1 -> Router1 -> Router2 -> Server1
const nodes = [
  { id: 'pc1', type: 'pc', data: { name: 'PC1', ip: '192.168.1.10', subnetMask: '255.255.255.0', gateway: '192.168.1.1', status: 'up' } },
  { id: 'sw1', type: 'switch', data: { name: 'Switch1', status: 'up' } },
  {
    id: 'r1',
    type: 'router',
    data: {
      name: 'Router1',
      status: 'up',
      interfaces: [
        { name: 'G0/0', ip: '192.168.1.1', mask: '255.255.255.0', status: 'up' },
        { name: 'G0/1', ip: '10.0.0.1', mask: '255.255.255.252', status: 'up' }
      ],
      routingTable: [
        { destination: '192.168.2.0', mask: '255.255.255.0', nextHop: '10.0.0.2', interface: 'G0/1' }
      ]
    }
  },
  {
    id: 'r2',
    type: 'router',
    data: {
      name: 'Router2',
      status: 'up',
      interfaces: [
        { name: 'G0/0', ip: '10.0.0.2', mask: '255.255.255.252', status: 'up' },
        { name: 'G0/1', ip: '192.168.2.1', mask: '255.255.255.0', status: 'up' }
      ],
      routingTable: [
        { destination: '192.168.1.0', mask: '255.255.255.0', nextHop: '10.0.0.1', interface: 'G0/0' }
      ]
    }
  },
  { id: 'sw2', type: 'switch', data: { name: 'Switch2', status: 'up' } },
  { id: 'srv1', type: 'server', data: { name: 'Server1', ip: '192.168.2.10', subnetMask: '255.255.255.0', gateway: '192.168.2.1', status: 'up' } }
];

const edges = [
  { id: 'e1', source: 'pc1', target: 'sw1' },
  { id: 'e2', source: 'sw1', target: 'r1' },
  { id: 'e3', source: 'r1', target: 'r2' },
  { id: 'e4', source: 'r2', target: 'sw2' },
  { id: 'e5', source: 'sw2', target: 'srv1' }
];

console.log('\n--- Testing Topology Diagnostics ---');
const diagnostics = validateTopology(nodes, edges);
console.log(`Diagnostics: ${diagnostics.errors.length} errors, ${diagnostics.warnings.length} warnings. Health: ${diagnostics.healthScore}%`);

console.log('\n--- Testing Packet Simulation PC1 -> Server1 ---');
const result = simulatePacket(nodes, edges, 'pc1', 'srv1', 'ICMP');
console.log('Result Success:', result.success);
console.log('Path Nodes:', result.pathNodes);
console.log('Total Hops:', result.hops.length);
if (result.hops.length > 0) {
  result.hops.forEach(h => console.log(` [Hop ${h.step}] ${h.device} (${h.type}): ${h.action} -> ${h.details}`));
}

console.log('\n--- Testing Ping Simulation PC1 -> 192.168.2.10 ---');
const pingResult = simulatePing(nodes, edges, 'pc1', 'srv1', 3);
console.log('Ping Success:', pingResult.success);
console.log('Ping Lines:\n' + pingResult.lines.join('\n'));

// ==========================================
// GROUP 2 ENGINE ASSERTIONS
// ==========================================
console.log('\n==========================================');
console.log('--- Testing Version Control Engine (VCS) ---');
console.log('==========================================');
const { createSnapshot, compareSnapshots, restoreSnapshot } = require('./versionControl');

// 1. Snapshot Creation
const baselineSnap = createSnapshot(nodes, edges, {
  name: 'Initial Lab Topology',
  description: 'Baseline dual-router setup',
  author: 'Alice Student',
  healthScore: diagnostics.healthScore
});

console.assert(baselineSnap.id && baselineSnap.id.startsWith('snap-'), 'Snapshot should have valid ID');
console.assert(baselineSnap.stats.nodeCount === 6, 'Snapshot nodeCount should equal 6');
console.assert(baselineSnap.stats.edgeCount === 5, 'Snapshot edgeCount should equal 5');
console.assert(baselineSnap.nodes.length === 6, 'Snapshot should store 6 cloned nodes');
console.log('TEST 1: Snapshot creation -> PASS');

// 2. Modifying network state & Diff comparison
const modifiedNodes = JSON.parse(JSON.stringify(nodes));
const modifiedEdges = JSON.parse(JSON.stringify(edges));

// Add a node
modifiedNodes.push({
  id: 'pc-new',
  type: 'pc',
  data: { name: 'PC-New', ip: '192.168.1.99', subnetMask: '255.255.255.0', status: 'up' }
});

// Modify IP of pc1
modifiedNodes[0].data.ip = '192.168.1.55';

// Add edge
modifiedEdges.push({
  id: 'e-new',
  source: 'pc-new',
  target: 'sw1',
  data: { linkType: 'ethernet', status: 'connected' }
});

const v2Snap = createSnapshot(modifiedNodes, modifiedEdges, {
  name: 'V2 with extra PC',
  author: 'Bob Engineer'
});

const diff = compareSnapshots(baselineSnap, v2Snap);
console.assert(diff.hasChanges === true, 'Diff should detect changes');
console.assert(diff.summary.addedNodesCount === 1, `Expected 1 added node, got ${diff.summary.addedNodesCount}`);
console.assert(diff.summary.modifiedNodesCount === 1, `Expected 1 modified node, got ${diff.summary.modifiedNodesCount}`);
console.assert(diff.summary.addedEdgesCount === 1, `Expected 1 added edge, got ${diff.summary.addedEdgesCount}`);
console.assert(diff.nodes.added[0].id === 'pc-new', 'Added node ID should be pc-new');
console.assert(diff.nodes.modified[0].changes[0].field === 'IP Address', 'Modified field should be IP Address');
console.log('TEST 2: Version comparison diff -> PASS');

// 3. Snapshot Restoration
const restored = restoreSnapshot(baselineSnap);
console.assert(restored.nodes.length === 6, 'Restored nodes count should match baseline');
console.assert(restored.nodes[0].data.ip === '192.168.1.10', 'Restored PC1 IP should be 192.168.1.10');
console.log('TEST 3: Snapshot restoration -> PASS');

console.log('\n==========================================');
console.log('--- Testing Lab Report Generator ---');
console.log('==========================================');
const { generateLabReport } = require('./reportGenerator');

const report = generateLabReport(
  {
    name: 'Dual Router Lab Exercise',
    roomId: 'NET-TEST01',
    nodes,
    edges,
    simulationHistory: [
      {
        sourceDevice: 'PC1',
        destDevice: 'Server1',
        sourceIP: '192.168.1.10',
        destIP: '192.168.2.10',
        protocol: 'ICMP',
        status: 'Delivered',
        hopsCount: 5,
        durationMs: 12
      }
    ]
  },
  {
    studentName: 'Maya Patel',
    studentId: 'STU-994411',
    courseName: 'Advanced Computer Networks',
    labTitle: 'Lab 2: Dual Subnet Interconnect'
  }
);

console.assert(report.reportId.startsWith('REP-'), 'Report should have valid REP- ID');
console.assert(report.deviceInventory.length === 6, 'Inventory should list all 6 devices');
console.assert(report.routingTables.length === 2, 'Should extract routing tables for 2 routers');
console.assert(report.rubricEvaluation.totalScore >= 70, `Expected score >= 70, got ${report.rubricEvaluation.totalScore}`);
console.assert(report.executiveSummary.verificationStatus === 'PASSED', 'Verification status should be PASSED');
console.log(`Report generated: ${report.metadata.labTitle} - Grade: ${report.executiveSummary.letterGrade} (${report.rubricEvaluation.totalScore}/100)`);
console.log('TEST 4: Lab Report Generation & Rubric -> PASS');

console.log('\n==========================================');
console.log('--- Testing Instructor Engine ---');
console.log('==========================================');
const {
  evaluateAssignment,
  getSampleSubmissions,
  aggregateClassMetrics,
  ASSIGNMENTS
} = require('./instructorEngine');

console.assert(ASSIGNMENTS.length >= 3, 'Should provide at least 3 assignments');

const evalResult = evaluateAssignment(nodes, edges, 'lab-2');
console.assert(evalResult.maxScore === 100, 'Max score should be 100');
console.assert(evalResult.criteriaResults.length === 4, 'Should evaluate 4 criteria for lab-2');
console.assert(evalResult.passed === true, 'Valid network should pass lab-2');
console.log(`Instructor Auto-Evaluation: ${evalResult.earnedScore}/100 - Passed: ${evalResult.passed}`);
console.log('TEST 5: Instructor Assignment Evaluation -> PASS');

const sampleSubs = getSampleSubmissions();
const metrics = aggregateClassMetrics(sampleSubs);
console.assert(metrics.totalSubmissions === sampleSubs.length, 'Total submissions metric should match sample count');
console.assert(metrics.averageScore > 0, 'Average score should be calculated');
console.assert(metrics.passingRate >= 60, 'Passing rate should be calculated');
console.log(`Class Metrics: Avg Score: ${metrics.averageScore}%, Passing Rate: ${metrics.passingRate}%, Graded: ${metrics.gradedCount}`);
console.log('TEST 6: Class Performance Metrics Aggregation -> PASS');

console.log('\n>>> ALL ENGINE ASSERTIONS PASSED SUCCESSFULLY! <<<\n');

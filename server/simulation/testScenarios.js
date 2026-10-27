/**
 * NetCollaborate Production Acceptance Test Suite
 * Validates the 10 Mandatory Networking Scenarios defined in Master Specification Section 18
 * Plus Project Persistence, Topology Validation, and Diff Mechanics.
 */

const { isValidIPv4, isValidSubnetMask, validateTopology } = require('./validator');
const { simulatePacket, simulatePing } = require('./packetSimulator');
const { longestPrefixMatch, resolveRouterForwarding } = require('./routing');
const { createSnapshot, compareSnapshots, restoreSnapshot } = require('./versionControl');
const { generateLabReport } = require('./reportGenerator');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ [FAIL] ${message}`);
    throw new Error(`Test assertion failed: ${message}`);
  }
}

console.log('===================================================================');
console.log('  NetCollaborate: 10 Mandatory Networking Scenarios Test Suite');
console.log('===================================================================\n');

// -------------------------------------------------------------------------
// SCENARIO 1: Two PCs on the same subnet communicate through a switch
// -------------------------------------------------------------------------
console.log('Scenario 1: Intra-Subnet Communication (PC1 -> Switch1 -> PC2)');
{
  const s1Nodes = [
    { id: 'pc1', type: 'pc', data: { name: 'PC1', ip: '192.168.1.10', subnetMask: '255.255.255.0', status: 'up' } },
    { id: 'sw1', type: 'switch', data: { name: 'Switch1', status: 'up' } },
    { id: 'pc2', type: 'pc', data: { name: 'PC2', ip: '192.168.1.20', subnetMask: '255.255.255.0', status: 'up' } }
  ];
  const s1Edges = [
    { id: 'e1', source: 'pc1', target: 'sw1', data: { status: 'connected' } },
    { id: 'e2', source: 'sw1', target: 'pc2', data: { status: 'connected' } }
  ];

  const res = simulatePacket(s1Nodes, s1Edges, 'pc1', 'pc2', 'ICMP');
  assert(res.success === true, 'Simulation succeeds between hosts on same subnet');
  assert(res.pathNodes.includes('pc1') && res.pathNodes.includes('sw1') && res.pathNodes.includes('pc2'), 'Path traverses PC1 -> Switch1 -> PC2');
  assert(res.packetInfo?.status === 'Delivered', 'Packet status is Delivered');
}

// -------------------------------------------------------------------------
// SCENARIO 2: Hosts on different subnets communicate through a configured router
// -------------------------------------------------------------------------
console.log('\nScenario 2: Inter-Subnet Communication via Router (PC1 -> Router1 -> Server1)');
{
  const s2Nodes = [
    { id: 'pc1', type: 'pc', data: { name: 'PC1', ip: '192.168.1.10', subnetMask: '255.255.255.0', gateway: '192.168.1.1', status: 'up' } },
    {
      id: 'r1',
      type: 'router',
      data: {
        name: 'Router1',
        status: 'up',
        interfaces: [
          { name: 'G0/0', ip: '192.168.1.1', mask: '255.255.255.0', status: 'up' },
          { name: 'G0/1', ip: '192.168.2.1', mask: '255.255.255.0', status: 'up' }
        ],
        routingTable: []
      }
    },
    { id: 'srv1', type: 'server', data: { name: 'Server1', ip: '192.168.2.10', subnetMask: '255.255.255.0', gateway: '192.168.2.1', status: 'up' } }
  ];
  const s2Edges = [
    { id: 'e1', source: 'pc1', target: 'r1', data: { status: 'connected' } },
    { id: 'e2', source: 'r1', target: 'srv1', data: { status: 'connected' } }
  ];

  const res = simulatePacket(s2Nodes, s2Edges, 'pc1', 'srv1', 'ICMP');
  assert(res.success === true, 'Hosts on different subnets communicate across router');
  assert(res.hops.some(h => h.device === 'Router1'), 'Hop trace records Router1 routing decision');
}

// -------------------------------------------------------------------------
// SCENARIO 3: Incorrect default gateway causes expected failure
// -------------------------------------------------------------------------
console.log('\nScenario 3: Incorrect Default Gateway Causes Expected Drop');
{
  const s3Nodes = [
    { id: 'pc1', type: 'pc', data: { name: 'PC1', ip: '192.168.1.10', subnetMask: '255.255.255.0', gateway: '192.168.99.1', status: 'up' } },
    {
      id: 'r1',
      type: 'router',
      data: {
        name: 'Router1',
        status: 'up',
        interfaces: [
          { name: 'G0/0', ip: '192.168.1.1', mask: '255.255.255.0', status: 'up' },
          { name: 'G0/1', ip: '192.168.2.1', mask: '255.255.255.0', status: 'up' }
        ]
      }
    },
    { id: 'srv1', type: 'server', data: { name: 'Server1', ip: '192.168.2.10', subnetMask: '255.255.255.0', gateway: '192.168.2.1', status: 'up' } }
  ];
  const s3Edges = [
    { id: 'e1', source: 'pc1', target: 'r1', data: { status: 'connected' } },
    { id: 'e2', source: 'r1', target: 'srv1', data: { status: 'connected' } }
  ];

  const res = simulatePacket(s3Nodes, s3Edges, 'pc1', 'srv1', 'ICMP');
  assert(res.success === false, 'Packet fails when default gateway is invalid');
  assert(res.reason && (res.reason.includes('Gateway') || res.reason.includes('gateway')), `Failure reason explicitly identifies gateway error: "${res.reason}"`);
}

// -------------------------------------------------------------------------
// SCENARIO 4: Missing route prevents communication where no alternate route exists
// -------------------------------------------------------------------------
console.log('\nScenario 4: Missing Route in Router Drops Packet (No Route / Net Unreachable)');
{
  const s4Nodes = [
    { id: 'pc1', type: 'pc', data: { name: 'PC1', ip: '192.168.1.10', subnetMask: '255.255.255.0', gateway: '192.168.1.1', status: 'up' } },
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
        routingTable: [] // Empty routing table -> NO route to 192.168.2.0/24!
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
        routingTable: []
      }
    },
    { id: 'srv1', type: 'server', data: { name: 'Server1', ip: '192.168.2.10', subnetMask: '255.255.255.0', gateway: '192.168.2.1', status: 'up' } }
  ];
  const s4Edges = [
    { id: 'e1', source: 'pc1', target: 'r1', data: { status: 'connected' } },
    { id: 'e2', source: 'r1', target: 'r2', data: { status: 'connected' } },
    { id: 'e3', source: 'r2', target: 'srv1', data: { status: 'connected' } }
  ];

  const res = simulatePacket(s4Nodes, s4Edges, 'pc1', 'srv1', 'ICMP');
  assert(res.success === false, 'Packet fails when router has no route to destination network');
  assert(res.reason && res.reason.includes('no route'), `Failure reason identifies missing route: "${res.reason}"`);
}

// -------------------------------------------------------------------------
// SCENARIO 5: Disconnected link prevents communication across that link
// -------------------------------------------------------------------------
console.log('\nScenario 5: Disconnected Link Prevents Communication');
{
  const s5Nodes = [
    { id: 'pc1', type: 'pc', data: { name: 'PC1', ip: '192.168.1.10', subnetMask: '255.255.255.0', status: 'up' } },
    { id: 'sw1', type: 'switch', data: { name: 'Switch1', status: 'up' } },
    { id: 'pc2', type: 'pc', data: { name: 'PC2', ip: '192.168.1.20', subnetMask: '255.255.255.0', status: 'up' } }
  ];
  // Edge 2 is disconnected!
  const s5Edges = [
    { id: 'e1', source: 'pc1', target: 'sw1', data: { status: 'connected' } },
    { id: 'e2', source: 'sw1', target: 'pc2', data: { status: 'disconnected' } }
  ];

  const res = simulatePacket(s5Nodes, s5Edges, 'pc1', 'pc2', 'ICMP');
  assert(res.success === false, 'Packet drops when link is disconnected');
  assert(res.reason && (res.reason.includes('No physical') || res.reason.includes('connection')), 'Reason reports no physical link connection');
}

// -------------------------------------------------------------------------
// SCENARIO 6: Disabled interface causes appropriate failure
// -------------------------------------------------------------------------
console.log('\nScenario 6: Disabled Interface (status: "down") Causes Failure');
{
  const s6Nodes = [
    { id: 'pc1', type: 'pc', data: { name: 'PC1', ip: '192.168.1.10', subnetMask: '255.255.255.0', status: 'down' } }, // Interface shut down!
    { id: 'pc2', type: 'pc', data: { name: 'PC2', ip: '192.168.1.20', subnetMask: '255.255.255.0', status: 'up' } }
  ];
  const s6Edges = [
    { id: 'e1', source: 'pc1', target: 'pc2', data: { status: 'connected' } }
  ];

  const res = simulatePacket(s6Nodes, s6Edges, 'pc1', 'pc2', 'ICMP');
  assert(res.success === false, 'Packet cannot be sent from administratively disabled interface');
  assert(res.reason && (res.reason.includes('turned off') || res.reason.includes('down')), 'Failure reports interface is down/disabled');
}

// -------------------------------------------------------------------------
// SCENARIO 7: Duplicate IP addresses produce a diagnostic error
// -------------------------------------------------------------------------
console.log('\nScenario 7: Duplicate IP Address Detection');
{
  const s7Nodes = [
    { id: 'pc1', type: 'pc', data: { name: 'PC1', ip: '192.168.1.10', subnetMask: '255.255.255.0', status: 'up' } },
    { id: 'pc2', type: 'pc', data: { name: 'PC2', ip: '192.168.1.10', subnetMask: '255.255.255.0', status: 'up' } } // DUPLICATE IP!
  ];
  const s7Edges = [
    { id: 'e1', source: 'pc1', target: 'pc2', data: { status: 'connected' } }
  ];

  const diagnostics = validateTopology(s7Nodes, s7Edges);
  const dupError = diagnostics.errors.find(e => e.type === 'duplicate_ip');
  assert(dupError !== undefined, 'Diagnostic engine detects duplicate IP error');
  assert(dupError.title.includes('192.168.1.10'), 'Diagnostic title identifies conflicting IP: 192.168.1.10');
  assert(diagnostics.healthScore < 100, `Health score is penalized: ${diagnostics.healthScore}%`);
}

// -------------------------------------------------------------------------
// SCENARIO 8: Adding a valid static route restores connectivity
// -------------------------------------------------------------------------
console.log('\nScenario 8: Adding Valid Static Route Restores Connectivity');
{
  const baseNodes = [
    { id: 'pc1', type: 'pc', data: { name: 'PC1', ip: '192.168.1.10', subnetMask: '255.255.255.0', gateway: '192.168.1.1', status: 'up' } },
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
        routingTable: [] // Initially missing!
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
    { id: 'srv1', type: 'server', data: { name: 'Server1', ip: '192.168.2.10', subnetMask: '255.255.255.0', gateway: '192.168.2.1', status: 'up' } }
  ];
  const baseEdges = [
    { id: 'e1', source: 'pc1', target: 'r1', data: { status: 'connected' } },
    { id: 'e2', source: 'r1', target: 'r2', data: { status: 'connected' } },
    { id: 'e3', source: 'r2', target: 'srv1', data: { status: 'connected' } }
  ];

  // 1. Initial attempt fails
  const initialRes = simulatePacket(baseNodes, baseEdges, 'pc1', 'srv1', 'ICMP');
  assert(initialRes.success === false, 'Initial attempt fails without static route');

  // 2. Add static route on Router1
  baseNodes[1].data.routingTable.push({
    destination: '192.168.2.0',
    mask: '255.255.255.0',
    nextHop: '10.0.0.2',
    interface: 'G0/1'
  });

  // 3. Retry simulation -> SUCCEEDS
  const restoredRes = simulatePacket(baseNodes, baseEdges, 'pc1', 'srv1', 'ICMP');
  assert(restoredRes.success === true, 'Adding static route successfully restores end-to-end packet connectivity');
}

// -------------------------------------------------------------------------
// SCENARIO 9: Packet traces show expected sequence of hops
// -------------------------------------------------------------------------
console.log('\nScenario 9: Packet Hop Sequence Accuracy');
{
  const s9Nodes = [
    { id: 'pc1', type: 'pc', data: { name: 'Client-PC', ip: '192.168.1.10', subnetMask: '255.255.255.0', gateway: '192.168.1.1', status: 'up' } },
    { id: 'sw1', type: 'switch', data: { name: 'Access-Switch', status: 'up' } },
    {
      id: 'r1',
      type: 'router',
      data: {
        name: 'Edge-Router',
        status: 'up',
        interfaces: [
          { name: 'G0/0', ip: '192.168.1.1', mask: '255.255.255.0', status: 'up' },
          { name: 'G0/1', ip: '10.0.0.1', mask: '255.255.255.0', status: 'up' }
        ],
        routingTable: []
      }
    },
    { id: 'srv1', type: 'server', data: { name: 'App-Server', ip: '10.0.0.50', subnetMask: '255.255.255.0', gateway: '10.0.0.1', status: 'up' } }
  ];
  const s9Edges = [
    { id: 'e1', source: 'pc1', target: 'sw1', data: { status: 'connected' } },
    { id: 'e2', source: 'sw1', target: 'r1', data: { status: 'connected' } },
    { id: 'e3', source: 'r1', target: 'srv1', data: { status: 'connected' } }
  ];

  const res = simulatePacket(s9Nodes, s9Edges, 'pc1', 'srv1', 'ICMP');
  assert(res.success === true, 'Simulation completes successfully');
  
  // Verify hop sequence devices
  const hopDevices = res.hops.map(h => h.device);
  assert(hopDevices[0] === 'Client-PC', 'Hop 1 origin is Client-PC');
  assert(hopDevices.includes('Access-Switch'), 'Hop sequence traverses Access-Switch');
  assert(hopDevices.includes('Edge-Router'), 'Hop sequence traverses Edge-Router');
  assert(hopDevices[hopDevices.length - 1] === 'App-Server', 'Final hop reaches App-Server');
}

// -------------------------------------------------------------------------
// SCENARIO 10: TTL expiration produces appropriate drop result
// -------------------------------------------------------------------------
console.log('\nScenario 10: TTL Expiration Handling');
{
  const s10Nodes = [
    { id: 'pc1', type: 'pc', data: { name: 'PC1', ip: '192.168.1.10', subnetMask: '255.255.255.0', gateway: '192.168.1.1', status: 'up' } },
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
    { id: 'srv1', type: 'server', data: { name: 'Server1', ip: '192.168.2.10', subnetMask: '255.255.255.0', gateway: '192.168.2.1', status: 'up' } }
  ];
  const s10Edges = [
    { id: 'e1', source: 'pc1', target: 'r1', data: { status: 'connected' } },
    { id: 'e2', source: 'r1', target: 'r2', data: { status: 'connected' } },
    { id: 'e3', source: 'r2', target: 'srv1', data: { status: 'connected' } }
  ];

  // Path requires 2 router hops. If initial TTL is 1, it must expire at Router1!
  const res = simulatePacket(s10Nodes, s10Edges, 'pc1', 'srv1', 'ICMP', 1);
  assert(res.success === false, 'Packet drops when TTL is insufficient to traverse all routers');
  assert(res.reason && (res.reason.includes('TTL') || res.reason.includes('Time to Live')), `Reason indicates TTL expired: "${res.reason}"`);
  assert(res.packetInfo?.ttl === 0, 'Packet info records TTL = 0');
}

// -------------------------------------------------------------------------
// SCENARIO 11: Project Persistence & JSON Import/Export Integrity
// -------------------------------------------------------------------------
console.log('\nScenario 11: Project Persistence, Snapshots & Diff Integrity');
{
  const testNodes = [
    { id: 'pc-test', type: 'pc', data: { name: 'TestPC', ip: '192.168.1.50', subnetMask: '255.255.255.0', status: 'up' } }
  ];
  const testEdges = [];

  const snap = createSnapshot(testNodes, testEdges, { name: 'Snapshot-1', author: 'Tester' });
  assert(snap.id && snap.id.startsWith('snap-'), 'Snapshot created with valid ID');

  const restored = restoreSnapshot(snap);
  assert(restored.nodes[0].data.ip === '192.168.1.50', 'Restored snapshot preserves host configuration');

  // Test report generation
  const report = generateLabReport(
    { name: 'Test Lab', roomId: 'NET-01', nodes: testNodes, edges: testEdges, simulationHistory: [] },
    { studentName: 'Student A', studentId: 'STU-01' }
  );
  assert(report.reportId.startsWith('REP-'), 'Report generator outputs valid REP document');
}

console.log('\n===================================================================');
console.log(`  ALL SCENARIOS PASSED: ${passedTests}/${totalTests} tests succeeded!`);
console.log('===================================================================\n');
